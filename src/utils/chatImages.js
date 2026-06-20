export const CHAT_IMAGE_BUCKET = 'chat-images';

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_STORED_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1600;

const loadBrowserImage = async (file) => {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const canvasBlob = (canvas, quality) => new Promise((resolve) => {
  canvas.toBlob(resolve, 'image/jpeg', quality);
});

export async function prepareChatImage(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('That photo is too large. Choose one under 20 MB.');

  let image;
  try {
    image = await loadBrowserImage(file);
  } catch {
    throw new Error('This photo format could not be prepared. Try a screenshot, JPEG, PNG, or WebP image.');
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let blob = null;
  for (const quality of [0.84, 0.72, 0.6]) {
    blob = await canvasBlob(canvas, quality);
    if (blob && blob.size <= MAX_STORED_BYTES) break;
  }
  if (!blob || blob.size > MAX_STORED_BYTES) throw new Error('The prepared photo is still over 5 MB. Choose a smaller image.');

  const baseName = (file.name || 'chat-photo').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'chat-photo';
  return {
    blob,
    fileName: `${baseName}.jpg`,
    previewUrl: URL.createObjectURL(blob),
  };
}

export function releaseChatImage(image) {
  if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
}

export function releaseChatImages(images) {
  (images || []).forEach(releaseChatImage);
}

export async function uploadChatImage(supabase, { scope, contextId, userId, image }) {
  const objectId = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${scope}/${contextId}/${userId}/${objectId}.jpg`;
  const { error } = await supabase.storage
    .from(CHAT_IMAGE_BUCKET)
    .upload(path, image.blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

export async function removeChatImage(supabase, path) {
  if (!path) return;
  const { error } = await supabase.storage.from(CHAT_IMAGE_BUCKET).remove([path]);
  if (error) throw error;
}

export async function removeChatImages(supabase, paths) {
  const uniquePaths = [...new Set((paths || []).filter(Boolean))];
  if (!uniquePaths.length) return;
  const { error } = await supabase.storage.from(CHAT_IMAGE_BUCKET).remove(uniquePaths);
  if (error) throw error;
}

export async function attachChatImageUrls(supabase, messages) {
  const attachmentsFor = (message) => {
    const paths = message.image_paths?.length ? message.image_paths : [message.image_path].filter(Boolean);
    const names = message.image_names?.length ? message.image_names : [message.image_name].filter(Boolean);
    return paths.map((path, index) => ({ path, name: names[index] || 'Chat photo' }));
  };
  const paths = [...new Set((messages || []).flatMap((message) => attachmentsFor(message).map((item) => item.path)))];
  if (!paths.length) return messages || [];
  const { data, error } = await supabase.storage.from(CHAT_IMAGE_BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) {
    console.error('Could not load chat images:', error);
    return messages || [];
  }
  const urlByPath = Object.fromEntries((data || []).map((item) => [item.path, item.signedUrl || null]));
  return (messages || []).map((message) => ({
    ...message,
    image_attachments: attachmentsFor(message).map((item) => ({
      ...item,
      url: urlByPath[item.path] || null,
    })),
  }));
}
