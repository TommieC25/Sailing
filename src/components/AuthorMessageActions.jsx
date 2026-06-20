import { useState } from 'react';

const styles = {
  actions: { display: 'flex', gap: '8px', marginTop: '6px', justifyContent: 'flex-end' },
  button: { border: 0, padding: 0, background: 'none', color: 'inherit', font: 'inherit', fontSize: '0.75rem', fontWeight: 900, textDecoration: 'underline', cursor: 'pointer', opacity: 0.85 },
  editor: { display: 'grid', gap: '7px', marginTop: '5px' },
  textarea: { width: '100%', minHeight: '140px', resize: 'vertical', border: '1px solid #94a3b8', borderRadius: '7px', padding: '10px', font: 'inherit', color: '#0f172a', background: '#ffffff' },
};

export default function AuthorMessageActions({ value, onSave, onDelete, allowEdit = true }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.trim() || draft.trim() === value.trim()) {
      setDraft(value);
      setEditing(false);
      return;
    }

    try {
      setSaving(true);
      await onSave(draft.trim());
      setEditing(false);
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this message? This cannot be undone.')) return;
    try {
      setSaving(true);
      await onDelete();
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div style={styles.editor}>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} style={styles.textarea} autoFocus />
        <div style={styles.actions}>
          <button type="button" onClick={save} disabled={saving || !draft.trim()} style={styles.button}>Save</button>
          <button type="button" onClick={() => { setDraft(value); setEditing(false); }} disabled={saving} style={styles.button}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.actions}>
      {allowEdit && <button type="button" onClick={() => setEditing(true)} disabled={saving} style={styles.button}>Edit</button>}
      <button type="button" onClick={remove} disabled={saving} style={styles.button}>Delete</button>
    </div>
  );
}
