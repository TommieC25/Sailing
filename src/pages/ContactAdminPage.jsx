import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthorSubmissionActions from '../components/AuthorSubmissionActions';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

const styles = {
  container: { maxWidth: '700px', margin: '0 auto' },
  backButton: { background: '#e0f2fe', border: '2px solid #0369a1', color: '#0369a1', fontWeight: 900, fontSize: '1.125rem', marginBottom: '16px', cursor: 'pointer', textDecoration: 'none', padding: '12px 16px', borderRadius: '8px', transition: 'all 0.2s' },
  header: { borderRadius: '12px', padding: '24px', marginBottom: '24px', background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)' },
  headerTitle: { fontSize: '1.875rem', fontWeight: 900, color: '#ffffff', margin: '0 0 8px 0' },
  headerSubtitle: { color: '#e0f2fe', fontSize: '1.125rem', fontWeight: 600, margin: 0 },
  card: { background: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' },
  errorBox: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', fontSize: '1rem', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 },
  successBox: { background: '#dcfce7', border: '2px solid #16a34a', color: '#166534', fontSize: '1rem', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 },
  form: { display: 'grid', gap: '16px' },
  fieldGroup: { display: 'grid', gap: '8px' },
  label: { fontSize: '1.125rem', fontWeight: 900, color: '#1e293b' },
  input: { width: '100%', padding: '12px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem', fontFamily: 'inherit' },
  textarea: { width: '100%', padding: '12px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem', fontFamily: 'inherit', minHeight: '120px', resize: 'vertical' },
  button: { width: '100%', padding: '12px', background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)', color: '#ffffff', fontWeight: 900, fontSize: '1.125rem', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' },
  list: { display: 'grid', gap: '10px', marginTop: '14px' },
  messageCard: { background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '12px' },
};

export default function ContactAdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({ subject: '', message: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!user) return;
    const loadMessages = async () => {
      const { data, error: loadError } = await supabase
        .from('contact_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (loadError) setError(loadError.message);
      else setMessages(data || []);
    };
    loadMessages();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!formData.message.trim()) {
      setError('Message is required');
      return;
    }

    try {
      setLoading(true);

      const { data: inserted, error: insertError } = await supabase.from('contact_messages').insert({
        user_id: user.id,
        subject: formData.subject,
        message: formData.message,
      }).select().single();

      if (insertError) throw insertError;

      setSuccess('Message sent! Admin will respond soon.');
      setMessages((current) => [inserted, ...current]);
      setFormData({ subject: '', message: '' });
      window.dispatchEvent(new Event('sailing:admin-inbox-updated'));
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const editMessage = async (id, subject, message) => {
    const { error: editError } = await supabase.rpc('edit_authored_submission', {
      p_kind: 'contact_message',
      p_id: id,
      p_title: subject,
      p_body: message,
    });
    if (editError) {
      setError(editError.message);
      throw editError;
    }
    setMessages((current) => current.map((item) => item.id === id ? { ...item, subject, message } : item));
    window.dispatchEvent(new Event('sailing:admin-inbox-updated'));
  };

  const deleteMessage = async (id) => {
    const { error: deleteError } = await supabase.rpc('delete_authored_submission', {
      p_kind: 'contact_message',
      p_id: id,
    });
    if (deleteError) {
      setError(deleteError.message);
      throw deleteError;
    }
    setMessages((current) => current.filter((item) => item.id !== id));
    window.dispatchEvent(new Event('sailing:direct-messages-updated'));
    window.dispatchEvent(new Event('sailing:admin-inbox-updated'));
  };

  return (
    <div style={styles.container}>
      <button
        onClick={() => navigate('/')}
        style={styles.backButton}
        onMouseEnter={(e) => e.target.style.background = '#bfdbfe'}
        onMouseLeave={(e) => e.target.style.background = '#e0f2fe'}
      >
        ← Back
      </button>

      <div style={styles.header}>
        <h1 style={styles.headerTitle}>📧 Contact Admin</h1>
        <p style={styles.headerSubtitle}>Questions or concerns? Reach out directly</p>
      </div>

      <div style={styles.card}>
        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Subject *</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="What is this about?"
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Message *</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us what's on your mind"
              style={styles.textarea}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => !loading && (e.target.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)')}
            onMouseLeave={(e) => (e.target.style.boxShadow = 'none')}
          >
            {loading ? 'Sending...' : 'Send Message →'}
          </button>
        </form>
      </div>

      <div style={{ ...styles.card, marginTop: '14px' }}>
        <h2 style={{ margin: '0 0 10px', color: '#1e293b' }}>Your Messages to Admin</h2>
        {messages.length === 0 ? (
          <p style={{ color: '#64748b', fontWeight: 700, margin: 0 }}>No messages sent yet.</p>
        ) : (
          <div style={styles.list}>
            {messages.map((item) => (
              <div key={item.id} style={styles.messageCard}>
                <h3 style={{ margin: '0 0 5px', color: '#0f172a' }}>{item.subject}</h3>
                <p style={{ margin: '0 0 5px', color: '#64748b', fontSize: '0.82rem', fontWeight: 700 }}>
                  Sent {new Date(item.created_at).toLocaleString()} · {item.status || 'open'}
                </p>
                <p style={{ margin: 0, color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{item.message}</p>
                <AuthorSubmissionActions
                  title={item.subject}
                  body={item.message}
                  onSave={(subject, message) => editMessage(item.id, subject, message)}
                  onDelete={() => deleteMessage(item.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
