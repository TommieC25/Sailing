import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

const styles = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(to bottom right, #0c3880, #0369a1, #06b6d4)', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '2rem', paddingBottom: '2rem' },
  innerContainer: { flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '448px', margin: '0 auto', width: '100%', justifyContent: 'center' },
  header: { textAlign: 'center', marginBottom: '2.5rem' },
  logo: { height: '112px', width: 'auto', margin: '0 auto 1rem 0', filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.3))' },
  title: { fontSize: '2.25rem', fontWeight: 900, color: '#ffffff', margin: '0 0 0.5rem 0', textShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  subtitle: { fontSize: '1rem', fontWeight: 600, color: '#e0f2fe', margin: 0 },
  card: { background: '#ffffff', borderRadius: '24px', boxShadow: '0 20px 25px rgba(0,0,0,0.2)', padding: '32px' },
  cardTitle: { fontSize: '1.875rem', fontWeight: 900, textAlign: 'center', marginBottom: '16px', color: '#1e3a8a', margin: '0 0 8px 0' },
  cardSubtitle: { fontSize: '0.875rem', fontWeight: 600, textAlign: 'center', color: '#64748b', marginBottom: '24px' },
  errorBox: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', fontSize: '1rem', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontWeight: 600 },
  successBox: { background: '#dcfce7', border: '2px solid #16a34a', color: '#166534', fontSize: '1rem', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontWeight: 600 },
  form: { display: 'grid', gap: '1.5rem' },
  fieldGroup: { display: 'grid', gap: '12px' },
  label: { display: 'block', fontSize: '1.125rem', fontWeight: 900, color: '#1e3a8a', marginBottom: '0.75rem' },
  input: { width: '100%', paddingX: '1.25rem', paddingY: '1rem', border: '3px solid #93c5fd', borderRadius: '12px', color: '#1e3a8a', fontSize: '1rem', fontWeight: 600, padding: '1rem 1.25rem', fontFamily: 'inherit' },
  button: { width: '100%', paddingY: '1.25rem', borderRadius: '12px', fontWeight: 900, color: '#ffffff', fontSize: '1.125rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)' },
  footer: { marginTop: '2rem', paddingTop: '1.5rem', borderTop: '3px solid #e5e7eb', textAlign: 'center' },
  footerLink: { color: '#0369a1', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', transition: 'all 0.2s' },
  bottomText: { color: '#ffffff', textAlign: 'center', fontSize: '1rem', fontWeight: 600, marginTop: '2rem', textShadow: '0 1px 3px rgba(0,0,0,0.4)' },
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    try {
      setLoading(true);

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/Sailing/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccess('Password reset link sent! Check your email.');
      setEmail('');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.innerContainer}>
        <div style={styles.header}>
          <img src="/Sailing/Club Logo.jpg" alt="CGSC Logo" style={styles.logo} />
          <h1 style={styles.title}>Reset Password</h1>
          <p style={styles.subtitle}>We'll send you a link to reset it</p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Forgot Password?</h2>
          <p style={styles.cardSubtitle}>Enter your email and we'll send you a password reset link</p>

          {error && <div style={styles.errorBox}>{error}</div>}
          {success && <div style={styles.successBox}>{success}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                style={styles.input}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.5 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => !loading && (e.target.style.boxShadow = '0 15px 25px rgba(0,0,0,0.3)')}
              onMouseLeave={(e) => (e.target.style.boxShadow = 'none')}
            >
              {loading ? 'Sending...' : 'Send Reset Link →'}
            </button>
          </form>

          <div style={styles.footer}>
            <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '0.875rem' }}>
              Remember your password?
            </p>
            <Link
              to="/login"
              style={styles.footerLink}
              onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
            >
              Back to Sign In →
            </Link>
          </div>
        </div>

        <p style={styles.bottomText}>Coconut Grove Sailing Club • Miami, FL</p>
      </div>
    </div>
  );
}
