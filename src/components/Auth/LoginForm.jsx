import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/supabaseClient';

const styles = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(to bottom right, #0c3880, #0369a1, #06b6d4)', padding: '1.25rem' },
  content: { maxWidth: '480px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  header: { textAlign: 'center', marginBottom: '1.25rem' },
  logo: { height: '86px', width: 'auto', margin: '0 auto 0.75rem', filter: 'drop-shadow(0 18px 35px rgba(0, 0, 0, 0.28))' },
  title: { fontSize: '2.2rem', fontWeight: 900, color: '#ffffff', margin: 0, textShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  subtitle: { fontSize: '1rem', fontWeight: 750, color: '#e0f2fe', margin: '0.35rem 0 0' },
  card: { background: '#ffffff', borderRadius: '18px', boxShadow: '0 18px 25px rgba(0,0,0,0.22)', padding: '22px' },
  cardTitle: { fontSize: '1.7rem', fontWeight: 900, color: '#1e3a8a', textAlign: 'center', margin: '0 0 16px' },
  form: { display: 'grid', gap: '1rem' },
  label: { fontSize: '1.05rem', fontWeight: 900, color: '#1e3a8a', display: 'block', marginBottom: '0.4rem' },
  input: { width: '100%', padding: '0.9rem 1rem', borderRadius: '10px', fontSize: '1.05rem', fontWeight: 650, color: '#1e3a8a', border: '3px solid #93c5fd', background: '#ffffff', outline: 'none', fontFamily: 'inherit' },
  button: { width: '100%', padding: '1rem', borderRadius: '10px', fontWeight: 900, fontSize: '1.15rem', background: '#06b6d4', color: '#111827', border: 'none', cursor: 'pointer', boxShadow: '0 8px 14px rgba(0,0,0,0.18)' },
  buttonDisabled: { opacity: 0.55, cursor: 'not-allowed' },
  loginError: { background: '#fee2e2', color: '#7f1d1d', fontSize: '1rem', padding: '0.9rem', borderRadius: '10px', marginBottom: '1rem', fontWeight: 800, border: '2px solid #ef4444', lineHeight: 1.45 },
  loginErrorActions: { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.7rem' },
  loginErrorLink: { color: '#991b1b', fontWeight: 900, textDecoration: 'underline' },
  success: { background: 'rgba(22, 163, 74, 0.95)', color: '#ffffff', fontSize: '1rem', padding: '0.9rem', borderRadius: '10px', marginBottom: '1rem', fontWeight: 800 },
  warning: { background: '#fef3c7', color: '#1f2937', padding: '1rem', borderRadius: '10px', marginBottom: '1rem', fontWeight: 750, fontSize: '0.98rem', lineHeight: 1.45, border: '2px solid #f59e0b' },
  smallButton: { background: '#ffffff', color: '#0369a1', border: '2px solid #0369a1', borderRadius: '9px', padding: '0.55rem 0.75rem', fontSize: '0.9rem', fontWeight: 900, cursor: 'pointer' },
  footer: { display: 'grid', gap: '0.9rem', marginTop: '1rem', textAlign: 'center' },
  link: { color: '#e0f2fe', fontSize: '1rem', fontWeight: 850, textDecoration: 'none' },
  newUser: { background: 'rgba(255,255,255,0.14)', border: '2px solid rgba(255,255,255,0.55)', borderRadius: '10px', padding: '12px', color: '#ffffff', fontSize: '1rem', fontWeight: 850, lineHeight: 1.4 },
  newUserLink: { display: 'block', color: '#ffffff', fontSize: '1.08rem', fontWeight: 900, textDecoration: 'underline', marginTop: '4px' },
  debug: { background: 'rgba(255,255,255,0.92)', color: '#1f2937', padding: '0.85rem', borderRadius: '0.75rem', marginBottom: '1rem', fontWeight: 700, fontSize: '0.95rem' },
};

export default function LoginForm() {
  const [searchParams] = useSearchParams();
  const { signIn, resendConfirmation } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const readAuthDebug = () => {
    try {
      return window.sessionStorage.getItem('sailingAuthDebug') || '';
    } catch {
      return 'Auth diagnostic unavailable: sessionStorage blocked.';
    }
  };
  const [authDebug, setAuthDebug] = useState(readAuthDebug);
  const showAuthDebug = searchParams.get('authDebug') === '1';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsConfirmation(false);
    setResendStatus('');
    const email = e.target.email.value.trim();
    const password = e.target.password.value;
    try {
      setLoading(true);
      let accountExists = null;
      const { data: emailExists, error: lookupError } = await supabase
        .rpc('auth_email_exists', { p_email: email });

      if (lookupError) {
        console.warn('Could not verify account before sign in:', lookupError.message);
      } else {
        accountExists = Boolean(emailExists);
        if (!accountExists) {
          setError('No such user account exists. Please create an account first.');
          return;
        }
      }

      await signIn(email, password);
      window.location.assign(`${window.location.origin}/Sailing/`);
    } catch (err) {
      try {
        setAuthDebug(window.sessionStorage.getItem('sailingAuthDebug') || '');
      } catch {
        setAuthDebug('Auth diagnostic unavailable: sessionStorage blocked.');
      }
      const msg = err.message || 'Failed to sign in';
      const code = err?.code || '';

      if (/email not confirmed/i.test(msg) || code === 'email_not_confirmed') {
        setNeedsConfirmation(true);
        setError('');
      } else if (/invalid login credentials/i.test(msg) || /user not found/i.test(msg) || code === 'invalid_grant') {
        setError('Invalid password. Please try again or reset your password.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendStatus('');
    try {
      await resendConfirmation(formData.email);
      setResendStatus('Confirmation email re-sent. Check your inbox and spam folder.');
    } catch (err) {
      setResendStatus(err.message || 'Could not resend confirmation email.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <img src="/Sailing/Club Logo.jpg" alt="CGSC Logo" style={styles.logo} />
          <h1 style={styles.title}>SailAway</h1>
          <p style={styles.subtitle}>Sign in to find outings, crew, and updates.</p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Sign In</h2>

          {searchParams.get('reset') === 'success' && (
            <div style={styles.success}>
              Password reset successfully. Sign in with your new password.
            </div>
          )}
          {showAuthDebug && authDebug && (
            <div style={styles.debug}>
              Auth diagnostic: {authDebug}
            </div>
          )}

          {error && (
            <div role="alert" aria-live="assertive" style={styles.loginError}>
              <div>{error}</div>
              <div style={styles.loginErrorActions}>
                <Link to="/forgot-password" style={styles.loginErrorLink}>Reset password</Link>
                <Link to="/signup" style={styles.loginErrorLink}>Create account</Link>
              </div>
            </div>
          )}

          {needsConfirmation && (
            <div style={styles.warning}>
              <div style={{fontSize: '1.08rem', fontWeight: 900, marginBottom: '0.35rem'}}>Please confirm your email first</div>
              <div style={{marginBottom: '0.75rem'}}>
                We sent a confirmation link to <strong>{formData.email}</strong>. Click it to verify your account, then sign in.
              </div>
              <button type="button" onClick={handleResend} style={{...styles.smallButton, background: '#0c2340', color: '#ffffff', borderColor: '#0c2340'}}>
                Resend confirmation email
              </button>
              {resendStatus && <div style={{marginTop: '0.75rem', fontSize: '0.95rem'}}>{resendStatus}</div>}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form} autoComplete="on">
            <div>
              <label htmlFor="login-email" style={styles.label}>Email</label>
              <input
                id="login-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="username"
                inputMode="email"
                required
                placeholder="your@email.com"
                style={styles.input}
              />
            </div>

            <div>
              <label htmlFor="login-password" style={styles.label}>Password</label>
              <input
                id="login-password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
                placeholder="Your password"
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={loading} style={{...styles.button, ...(loading ? styles.buttonDisabled : {})}}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div style={styles.footer}>
          <div style={styles.newUser}>
            New to SailAway?
            <Link to="/signup" style={styles.newUserLink}>Create New Account</Link>
          </div>
          <Link to="/forgot-password" style={styles.link}>Forgot Password?</Link>
        </div>
      </div>
    </div>
  );
}
