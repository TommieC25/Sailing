import { useRef, useState } from 'react';
import { prepareChatImage, releaseChatImage } from '../utils/chatImages';

const styles = {
  actions: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  pick: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', border: '2px solid #0284c7', color: '#075985', borderRadius: '7px', padding: '8px 10px', fontWeight: 900, cursor: 'pointer' },
  remove: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', borderRadius: '7px', padding: '7px 9px', fontWeight: 900, cursor: 'pointer' },
  preview: { display: 'block', width: '100%', maxWidth: '320px', maxHeight: '240px', objectFit: 'contain', borderRadius: '7px', border: '1px solid #94a3b8', background: '#f8fafc', marginTop: '8px' },
  error: { color: '#991b1b', fontWeight: 800, fontSize: '0.86rem' },
};

export default function ChatImagePicker({ value, onChange, disabled = false }) {
  const inputRef = useRef(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');

  const chooseImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setPreparing(true);
      setError('');
      const prepared = await prepareChatImage(file);
      releaseChatImage(value);
      onChange(prepared);
    } catch (err) {
      setError(err.message || 'Could not prepare this image.');
    } finally {
      setPreparing(false);
    }
  };

  const remove = () => {
    releaseChatImage(value);
    onChange(null);
    setError('');
  };

  return (
    <div>
      <div style={styles.actions}>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || preparing} style={{ ...styles.pick, opacity: disabled || preparing ? 0.55 : 1 }}>
          📷 {preparing ? 'Preparing photo...' : value ? 'Change Photo' : 'Add Photo'}
        </button>
        {value && <button type="button" onClick={remove} disabled={disabled} style={styles.remove}>Remove</button>}
        <input ref={inputRef} type="file" accept="image/*" onChange={chooseImage} disabled={disabled || preparing} style={{ display: 'none' }} />
      </div>
      {value?.previewUrl && <img src={value.previewUrl} alt="Selected chat attachment" style={styles.preview} />}
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}
