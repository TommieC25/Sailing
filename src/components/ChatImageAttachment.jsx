const imageStyle = {
  display: 'block',
  width: '100%',
  maxHeight: '360px',
  objectFit: 'contain',
  borderRadius: '7px',
  background: '#f8fafc',
  marginTop: '7px',
};

export default function ChatImageAttachment({ url, name = 'Chat photo' }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name}`}>
      <img src={url} alt={name} loading="lazy" style={imageStyle} />
    </a>
  );
}
