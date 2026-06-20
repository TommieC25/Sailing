const galleryStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '5px',
  marginTop: '7px',
};

const imageStyle = {
  display: 'block',
  width: '100%',
  height: '100%',
  maxHeight: '280px',
  aspectRatio: '1',
  objectFit: 'cover',
  borderRadius: '7px',
  background: '#f8fafc',
};

export default function ChatImageAttachment({ attachments = [] }) {
  const visible = attachments.filter((attachment) => attachment.url);
  if (!visible.length) return null;
  return (
    <div style={{ ...galleryStyle, ...(visible.length === 1 ? { gridTemplateColumns: '1fr' } : {}) }}>
      {visible.map((attachment, index) => (
        <a key={attachment.path} href={attachment.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${attachment.name || `chat photo ${index + 1}`}`}>
          <img src={attachment.url} alt={attachment.name || `Chat photo ${index + 1}`} loading="lazy" style={imageStyle} />
        </a>
      ))}
    </div>
  );
}
