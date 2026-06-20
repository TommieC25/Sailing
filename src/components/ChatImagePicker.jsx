import { useEffect, useRef, useState } from 'react';
import { prepareChatImage, releaseChatImage } from '../utils/chatImages';

const MAX_PHOTOS = 5;

const styles = {
  actions: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  pick: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', border: '2px solid #0284c7', color: '#075985', borderRadius: '7px', padding: '8px 10px', fontWeight: 900, cursor: 'pointer' },
  previewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px', marginTop: '8px' },
  previewWrap: { position: 'relative', aspectRatio: '1', minWidth: 0 },
  preview: { display: 'block', width: '100%', height: '100%', objectFit: 'cover', borderRadius: '7px', border: '1px solid #94a3b8', background: '#f8fafc' },
  remove: { position: 'absolute', top: '4px', right: '4px', width: '30px', height: '30px', background: '#dc2626', border: '2px solid #ffffff', color: '#ffffff', borderRadius: '50%', padding: 0, fontWeight: 900, cursor: 'pointer' },
  count: { color: '#475569', fontWeight: 800, fontSize: '0.82rem' },
  error: { color: '#991b1b', fontWeight: 800, fontSize: '0.86rem' },
};

export default function ChatImagePicker({ value, onChange, disabled = false }) {
  const inputRef = useRef(null);
  const valueRef = useRef(value);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => () => valueRef.current.forEach(releaseChatImage), []);

  const chooseImages = async (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    if (!files.length) return;
    const available = MAX_PHOTOS - value.length;
    if (files.length > available) {
      setError(`Choose no more than ${available} additional photo${available === 1 ? '' : 's'}.`);
      return;
    }
    const prepared = [];
    try {
      setPreparing(true);
      setError('');
      for (const file of files) prepared.push(await prepareChatImage(file));
      onChange([...value, ...prepared]);
    } catch (err) {
      prepared.forEach(releaseChatImage);
      setError(err.message || 'Could not prepare this image.');
    } finally {
      setPreparing(false);
    }
  };

  const remove = (index) => {
    releaseChatImage(value[index]);
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
    setError('');
  };

  return (
    <div>
      <div style={styles.actions}>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || preparing || value.length >= MAX_PHOTOS} style={{ ...styles.pick, opacity: disabled || preparing || value.length >= MAX_PHOTOS ? 0.55 : 1 }}>
          📷 {preparing ? 'Preparing photos...' : value.length ? 'Add More Photos' : 'Add Photos'}
        </button>
        <span style={styles.count}>{value.length} of {MAX_PHOTOS}</span>
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={chooseImages} disabled={disabled || preparing || value.length >= MAX_PHOTOS} style={{ display: 'none' }} />
      </div>
      {value.length > 0 && (
        <div style={styles.previewGrid}>
          {value.map((image, index) => (
            <div key={image.previewUrl} style={styles.previewWrap}>
              <img src={image.previewUrl} alt={`Selected chat attachment ${index + 1}`} style={styles.preview} />
              <button type="button" onClick={() => remove(index)} disabled={disabled} aria-label={`Remove photo ${index + 1}`} style={styles.remove}>×</button>
            </div>
          ))}
        </div>
      )}
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}
