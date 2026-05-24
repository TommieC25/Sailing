import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

const styles = {
  container: { maxWidth: '600px', margin: '0 auto' },
  backButton: { background: '#e0f2fe', border: '2px solid #0369a1', color: '#0369a1', fontWeight: 900, fontSize: '1.125rem', marginBottom: '16px', cursor: 'pointer', textDecoration: 'none', padding: '12px 16px', borderRadius: '8px', transition: 'all 0.2s' },
  header: { borderRadius: '12px', padding: '24px', marginBottom: '24px', background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)' },
  headerTitle: { fontSize: '1.875rem', fontWeight: 900, color: '#ffffff', margin: '0 0 8px 0' },
  headerSubtitle: { color: '#e0f2fe', fontSize: '1.125rem', fontWeight: 600, margin: 0 },
  card: { background: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px' },
  guidanceBox: { background: '#f0f9ff', border: '2px solid #bfdbfe', color: '#0c2340', borderRadius: '8px', padding: '16px', fontSize: '1rem', fontWeight: 700, lineHeight: 1.5 },
  form: { display: 'grid', gap: '20px' },
  fieldGroup: { display: 'grid', gap: '8px' },
  label: { fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'block' },
  input: { width: '100%', padding: '12px 16px', border: '2px solid #dbeafe', borderRadius: '8px', fontSize: '1rem', fontWeight: 500, color: '#1e293b', fontFamily: 'inherit', background: '#ffffff' },
  textarea: { width: '100%', padding: '12px 16px', border: '2px solid #dbeafe', borderRadius: '8px', fontSize: '1rem', fontWeight: 500, color: '#1e293b', fontFamily: 'inherit', minHeight: '120px', resize: 'vertical', background: '#ffffff' },
  fileInput: { padding: '12px 16px', border: '2px dashed #dbeafe', borderRadius: '8px', fontSize: '1rem', color: '#1e293b', cursor: 'pointer', background: '#f0f9ff' },
  buttons: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingBottom: '8px' },
  submitButton: { padding: '16px', borderRadius: '8px', fontWeight: 900, fontSize: '1.125rem', color: '#ffffff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'all 0.2s' },
  cancelButton: { padding: '16px', borderRadius: '8px', fontWeight: 900, fontSize: '1.125rem', background: '#e5e7eb', color: '#1e293b', border: 'none', cursor: 'pointer', transition: 'all 0.2s' },
  errorBox: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', fontSize: '1rem', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontWeight: 600 },
  successBox: { background: '#f0fdf4', border: '2px solid #16a34a', color: '#166534', fontSize: '1rem', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontWeight: 600 },
  screenshotPreview: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginTop: '8px' },
  screenshotThumb: { width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #dbeafe', position: 'relative' },
  removeButton: { position: 'absolute', top: '-8px', right: '-8px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 900, fontSize: '0.75rem' },
};

export default function BugReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!user) {
    return <div style={styles.errorBox}>Please sign in to report bugs.</div>;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Please fill in both title and description');
      return;
    }

    try {
      setLoading(true);
      let screenshotUrl = null;

      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `bug-reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(filePath, screenshot, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('profiles').getPublicUrl(filePath);
        screenshotUrl = data.publicUrl;
      }

      const { error: insertError } = await supabase
        .from('bug_reports')
        .insert([
          {
            user_id: user.id,
            title: formData.title,
            description: formData.description,
            screenshot_url: screenshotUrl,
          },
        ]);

      if (insertError) throw insertError;

      setSuccess(true);
      setFormData({ title: '', description: '' });
      setScreenshot(null);
      setScreenshotPreview(null);

      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to submit bug report');
    } finally {
      setLoading(false);
    }
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
        <h1 style={styles.headerTitle}>🐛 Report a Bug</h1>
        <p style={styles.headerSubtitle}>Help us improve the app by reporting issues you encounter</p>
      </div>

      <div style={styles.card}>
        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>✓ Bug report submitted! Thank you for helping us improve.</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.guidanceBox}>
            Please be clear and specific. Describe what you are seeing, what you expected, and why it does not seem right. A screenshot will usually be necessary to fully address a bug. Thank you!
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              style={styles.input}
              placeholder="e.g., Back button not working on profile page"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              style={styles.textarea}
              placeholder="Describe what happened, what you expected, and any steps to reproduce the issue..."
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Screenshot (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleScreenshotChange}
              style={styles.fileInput}
            />
            {screenshotPreview && (
              <div style={styles.screenshotPreview}>
                <div style={{ position: 'relative' }}>
                  <img src={screenshotPreview} alt="Screenshot preview" style={styles.screenshotThumb} />
                  <button
                    type="button"
                    onClick={removeScreenshot}
                    style={styles.removeButton}
                    title="Remove screenshot"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={styles.buttons}>
            <button
              type="submit"
              disabled={loading}
              style={{...styles.submitButton, background: loading ? '#9ca3af' : '#06b6d4', opacity: loading ? 0.5 : 1}}
              onMouseEnter={(e) => !loading && (e.target.style.opacity = '0.9')}
              onMouseLeave={(e) => !loading && (e.target.style.opacity = '1')}
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={styles.cancelButton}
              onMouseEnter={(e) => e.target.style.background = '#d1d5db'}
              onMouseLeave={(e) => e.target.style.background = '#e5e7eb'}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
