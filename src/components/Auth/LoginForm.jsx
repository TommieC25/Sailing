import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/supabaseClient';

const styles = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(to bottom right, #0c3880, #0369a1, #06b6d4)', paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingTop: '2rem', paddingBottom: '2rem' },
  content: { maxWidth: '800px', margin: '0 auto', width: '100%' },
  header: { textAlign: 'center', marginBottom: '2.5rem' },
  logo: { height: '112px', width: 'auto', margin: '0 auto 1.25rem', filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.3))' },
  title: { fontSize: '3rem', fontWeight: 900, color: '#ffffff', marginBottom: '0.5rem', textShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  subtitle: { fontSize: '1.875rem', fontWeight: 900, color: '#a5f3fc', textShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  sectionTitle: { fontSize: '1.875rem', fontWeight: 900, color: '#ffffff', marginBottom: '1.25rem' },
  sectionBox: { background: 'rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '0.75rem 1.5rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.2)' },
  label: { fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', marginBottom: '0.75rem', display: 'block' },
  input: { width: '100%', padding: '1rem', borderRadius: '0.75rem', fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', placeholder: '#e0f2fe', border: '2px solid #93c5fd', background: 'rgba(255,255,255,0.15)', outline: 'none', marginBottom: '1.5rem', fontFamily: 'inherit' },
  button: { width: '100%', padding: '1.25rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '1.5rem', background: '#06b6d4', color: '#111827', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px rgba(0,0,0,0.2)', transition: 'all 0.2s' },
  buttonDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  error: { background: 'rgba(239, 68, 68, 0.8)', color: '#ffffff', fontSize: '1.1rem', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 700 },
  loginError: { background: '#fee2e2', color: '#7f1d1d', fontSize: '1.05rem', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontWeight: 800, border: '2px solid #ef4444', lineHeight: 1.45 },
  loginErrorActions: { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' },
  loginErrorLink: { color: '#991b1b', fontWeight: 900, textDecoration: 'underline' },
  section: { marginBottom: '2rem' },
  description: { color: '#e0f2fe', fontSize: '1.125rem', fontWeight: 600, lineHeight: '1.6' },
  card: { display: 'flex', alignItems: 'flex-start', gap: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.2)', marginBottom: '0.75rem' },
  emoji: { fontSize: '1.875rem', flexShrink: 0 },
  cardTitle: { color: '#ffffff', fontSize: '1.375rem', fontWeight: 900, marginBottom: '0.25rem' },
  cardDesc: { color: '#e0f2fe', fontSize: '1rem', fontWeight: 600 },
  signUpLink: { display: 'block', width: '100%', padding: '1.25rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '1.5rem', background: '#ffffff', color: '#111827', textDecoration: 'none', textAlign: 'center', boxShadow: '0 10px 15px rgba(0,0,0,0.2)', transition: 'all 0.2s', marginBottom: '2.5rem' },
  signUpText: { color: '#e0f2fe', fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' },
};

export default function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signOut, resendConfirmation } = useAuth();
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
          setError('No such user account exists. Please sign up.');
          return;
        }
      }

      await signIn(email, password);
      navigate('/');
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
      setResendStatus('Confirmation email re-sent. Check your inbox (and spam folder).');
    } catch (err) {
      setResendStatus(err.message || 'Could not resend confirmation email.');
    }
  };

  const handleSignOut = async () => {
    setError('');
    setNeedsConfirmation(false);
    setResendStatus('');
    await signOut();
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>

        {/* Logo + Title */}
        <div style={styles.header}>
          <img src="/Sailing/Club Logo.jpg" alt="CGSC Logo" style={styles.logo} />
          <h1 style={styles.title}>Sail Away<br />With CGSC!</h1>
        </div>

        {/* Welcome to community */}
        <div style={styles.section}>
          <p style={styles.description}>
            Welcome to the community of sailors at Coconut Grove Sailing Club. Whether you own a boat or love crewing, this app connects you with people and outings.
          </p>
        </div>

        {/* How It Works */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Here's How It Works</h2>

          <div style={styles.sectionBox}>
            <p style={{...styles.cardTitle, marginBottom: '0.75rem'}}>🚢 Skippers</p>
            <p style={styles.description}>
              Manage your outings and invite crew. Post your upcoming sail, review crew requests, approve who joins, and chat with your crew.
            </p>
          </div>

          <div style={styles.sectionBox}>
            <p style={{...styles.cardTitle, marginBottom: '0.75rem'}}>⛵ Crew</p>
            <p style={styles.description}>
              Browse upcoming outings and request to join. Find a sail you like, ask the skipper if you can crew, and connect with your team.
            </p>
          </div>

          <div style={styles.sectionBox}>
            <p style={{...styles.cardTitle, marginBottom: '0.75rem'}}>💬 Group Chat</p>
            <p style={styles.description}>
              Stay connected before, during, and after each outing. Share updates, photos, and stay in touch with your sailing community.
            </p>
          </div>
        </div>

        {/* Getting Started */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Getting Started</h2>
          {[
            { n: '1️⃣', text: 'Create Your Account — Sign up with your email and password.' },
            { n: '2️⃣', text: 'Complete Your Profile — Add a photo and tell us about your sailing experience.' },
            { n: '3️⃣', text: 'Create or Browse Outings — Skippers post, crew explore what\'s available.' },
            { n: '4️⃣', text: 'Plan Your Cruise — Connect with your team, confirm details, get ready.' },
            { n: '5️⃣', text: 'Show Up and Shove Off! — Hit the water and make memories.' },
          ].map(({ n, text }) => (
            <div key={n} style={{display: 'flex', alignItems: 'flex-start', gap: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.2)', marginBottom: '0.75rem'}}>
              <span style={{fontSize: '1.375rem', flexShrink: 0}}>{n}</span>
              <p style={{color: '#ffffff', fontSize: '1.125rem', fontWeight: 600, lineHeight: '1.5', margin: 0}}>{text}</p>
            </div>
          ))}
        </div>

        <div style={{...styles.section, textAlign: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.2)'}}>
          <p style={{...styles.description, margin: 0, fontSize: '1.25rem'}}>⛵ Ready to set sail?</p>
          <p style={{...styles.sectionTitle, marginTop: '0.5rem', color: '#a5f3fc'}}>Permission Granted to Come Aboard!</p>
        </div>

        {/* Sign In Form */}
        <div style={{marginBottom: '1.5rem'}}>

          {searchParams.get('reset') === 'success' && (
            <div style={{background: 'rgba(22, 163, 74, 0.95)', color: '#ffffff', fontSize: '1.1rem', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 800}}>
              Password reset successfully. Sign in with your new password.
            </div>
          )}
          {showAuthDebug && authDebug && (
            <div style={{background: 'rgba(255,255,255,0.92)', color: '#1f2937', padding: '0.85rem', borderRadius: '0.75rem', marginBottom: '1rem', fontWeight: 700, fontSize: '0.95rem'}}>
              Auth diagnostic: {authDebug}
            </div>
          )}

          {user && (
            <div style={{background: 'rgba(255,255,255,0.92)', color: '#1f2937', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 700}}>
              You are already signed in. To test or use a different account, sign out first.
              <button
                type="button"
                onClick={handleSignOut}
                style={{display: 'block', marginTop: '0.75rem', background: '#0c2340', color: '#ffffff', border: 'none', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontWeight: 900, cursor: 'pointer'}}
              >
                Sign Out
              </button>
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
            <div style={{background: 'rgba(251, 191, 36, 0.95)', color: '#1f2937', padding: '1.25rem', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.5}}>
              <div style={{fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem'}}>Please confirm your email first</div>
              <div style={{marginBottom: '0.75rem'}}>
                We sent a confirmation link to <strong>{formData.email}</strong>. Click it to verify your account, then sign in. Check your spam folder if you don't see it.
              </div>
              <button
                type="button"
                onClick={handleResend}
                style={{background: '#0c2340', color: '#ffffff', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '0.5rem', fontWeight: 900, fontSize: '1rem', cursor: 'pointer'}}
              >
                Resend confirmation email
              </button>
              {resendStatus && <div style={{marginTop: '0.75rem', fontSize: '0.95rem'}}>{resendStatus}</div>}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}} autoComplete="on">
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

            <button
              type="submit"
              disabled={loading}
              style={{...styles.button, ...(loading ? styles.buttonDisabled : {})}}
            >
              {loading ? 'Setting Sail...' : "Let's Go Sailing!"}
            </button>
          </form>

          <div style={{textAlign: 'center', marginTop: '1.5rem'}}>
            <Link
              to="/forgot-password"
              style={{color: '#e0f2fe', fontSize: '1.125rem', fontWeight: 700, textDecoration: 'none', transition: 'all 0.2s'}}
              onMouseEnter={(e) => (e.target.style.color = '#a5f3fc')}
              onMouseLeave={(e) => (e.target.style.color = '#e0f2fe')}
            >
              Forgot Password? <strong>CLICK HERE</strong>
            </Link>
          </div>
        </div>

        {/* Sign Up CTA */}
        <div style={{textAlign: 'center', paddingBottom: '2.5rem'}}>
          <p style={{...styles.signUpText, fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem'}}>New Here?</p>
          <Link to="/signup" style={styles.signUpLink}>
            Create Account →
          </Link>
        </div>

      </div>
    </div>
  );
}
