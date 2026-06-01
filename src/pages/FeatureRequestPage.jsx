import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  requestList: { display: 'grid', gap: '10px', marginTop: '14px' },
  requestCard: { background: '#ffffff', borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', padding: '12px' },
  statusBadge: { borderRadius: '999px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 900 },
  openButton: { display: 'block', marginTop: '8px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #0369a1', borderRadius: '8px', padding: '8px 10px', fontWeight: 900, cursor: 'pointer' },
};

const statusLabel = (status) => {
  const labels = {
    pending: 'Pending',
    in_development: 'In Development',
    implemented: 'Implemented',
  };
  return labels[status] || 'Pending';
};

const statusColors = (status) => {
  if (status === 'implemented') return { background: '#dcfce7', color: '#166534' };
  if (status === 'in_development') return { background: '#dbeafe', color: '#1e40af' };
  return { background: '#fef3c7', color: '#92400e' };
};

export default function FeatureRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [myRequests, setMyRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchMyRequests = async () => {
      try {
        setRequestsLoading(true);
        const { data, error: requestsError } = await supabase
          .from('feature_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (requestsError) throw requestsError;
        setMyRequests(data || []);
      } catch (err) {
        setError(err.message || 'Could not load feature requests');
      } finally {
        setRequestsLoading(false);
      }
    };

    fetchMyRequests();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    try {
      setLoading(true);

      const { data: inserted, error: insertError } = await supabase.from('feature_requests').insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        status: 'pending',
      }).select().single();

      if (insertError) throw insertError;

      setSuccess('Feature request submitted! Thank you for helping us improve.');
      setMyRequests((current) => [inserted, ...current]);
      setFormData({ title: '', description: '' });
    } catch (err) {
      setError(err.message || 'Failed to submit feature request');
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
        <h1 style={styles.headerTitle}>⭐ Feature Request</h1>
        <p style={styles.headerSubtitle}>Help us build the features you need</p>
      </div>

      <div style={styles.card}>
        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Feature Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Brief title of the feature"
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the feature you'd like to see and why it would be helpful"
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
            {loading ? 'Submitting...' : 'Submit Feature Request →'}
          </button>
        </form>
      </div>

      <div style={{ ...styles.card, marginTop: '14px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', margin: '0 0 10px 0' }}>Your Feature Requests</h2>
        {requestsLoading ? (
          <p style={{ color: '#64748b', fontWeight: 700, margin: 0 }}>Loading...</p>
        ) : myRequests.length === 0 ? (
          <p style={{ color: '#64748b', fontWeight: 700, margin: 0 }}>No feature requests submitted yet.</p>
        ) : (
          <div style={styles.requestList}>
            {myRequests.map((request) => (
              <div key={request.id} style={styles.requestCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/feature-request/${request.id}?returnTo=${encodeURIComponent('/feature-request')}`)}
                    style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0369a1', margin: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                  >
                    {request.title}
                  </button>
                  <span style={{ ...styles.statusBadge, ...statusColors(request.status) }}>
                    {statusLabel(request.status)}
                  </span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600, margin: '0 0 6px 0' }}>
                  Submitted {new Date(request.created_at).toLocaleString()}
                </p>
                <p style={{ color: '#475569', margin: 0, lineHeight: 1.38, fontSize: '0.92rem', whiteSpace: 'pre-wrap' }}>{request.description}</p>
                <button
                  type="button"
                  onClick={() => navigate(`/feature-request/${request.id}?returnTo=${encodeURIComponent('/feature-request')}`)}
                  style={styles.openButton}
                >
                  Open conversation
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
