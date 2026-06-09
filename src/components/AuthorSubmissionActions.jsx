import { useState } from 'react';

const styles = {
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' },
  button: { border: 0, borderRadius: '7px', padding: '8px 10px', fontWeight: 900, cursor: 'pointer' },
  edit: { background: '#e0f2fe', color: '#0369a1' },
  danger: { background: '#dc2626', color: '#ffffff' },
  cancel: { background: '#e5e7eb', color: '#334155' },
  form: { display: 'grid', gap: '8px', marginTop: '10px' },
  input: { width: '100%', border: '1px solid #94a3b8', borderRadius: '7px', padding: '9px', font: 'inherit', color: '#0f172a', background: '#ffffff' },
  textarea: { width: '100%', minHeight: '90px', resize: 'vertical', border: '1px solid #94a3b8', borderRadius: '7px', padding: '9px', font: 'inherit', color: '#0f172a', background: '#ffffff' },
};

export default function AuthorSubmissionActions({ title, body, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftBody, setDraftBody] = useState(body);
  const [saving, setSaving] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    if (!draftTitle.trim() || !draftBody.trim()) return;
    try {
      setSaving(true);
      await onSave(draftTitle.trim(), draftBody.trim());
      setEditing(false);
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this submission and its entire conversation? This cannot be undone.')) return;
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
      <form onSubmit={save} style={styles.form}>
        <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} style={styles.input} aria-label="Title" autoFocus />
        <textarea value={draftBody} onChange={(event) => setDraftBody(event.target.value)} style={styles.textarea} aria-label="Message" />
        <div style={styles.actions}>
          <button type="submit" disabled={saving || !draftTitle.trim() || !draftBody.trim()} style={{ ...styles.button, ...styles.edit }}>Save Changes</button>
          <button type="button" disabled={saving} onClick={() => { setDraftTitle(title); setDraftBody(body); setEditing(false); }} style={{ ...styles.button, ...styles.cancel }}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div style={styles.actions}>
      <button type="button" disabled={saving} onClick={() => setEditing(true)} style={{ ...styles.button, ...styles.edit }}>Edit</button>
      <button type="button" disabled={saving} onClick={remove} style={{ ...styles.button, ...styles.danger }}>Delete</button>
    </div>
  );
}
