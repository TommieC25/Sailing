import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const styles = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(to bottom right, #0c3880, #0369a1, #06b6d4)', paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingTop: '2rem', paddingBottom: '2rem' },
  content: { maxWidth: '800px', margin: '0 auto', width: '100%' },
  header: { textAlign: 'center', marginBottom: '2.5rem' },
  logo: { height: '112px', width: 'auto', margin: '0 auto 1.25rem', filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.3))' },
  title: { fontSize: '3rem', fontWeight: 900, color: '#ffffff', marginBottom: '0.5rem', textShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  subtitle: { fontSize: '1.875rem', fontWeight: 900, color: '#a5f3fc', textShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  sectionTitle: { fontSize: '1.875rem', fontWeight: 900, color: '#ffffff', marginBottom: '1.25rem' },
  sectionBox: { background: 'rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.2)' },
  label: { fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', marginBottom: '0.75rem', display: 'block' },
  input: { width: '100%', padding: '1rem', borderRadius: '0.75rem', fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', placeholder: '#e0f2fe', border: '2px solid #93c5fd', background: 'rgba(255,255,255,0.15)', outline: 'none', marginBottom: '1.5rem', fontFamily: 'inherit' },
  button: { width: '100%', padding: '1.25rem', borderRadius: '0.75rem', fontWeight: 900, fontSize: '1.5rem', background: '#06b6d4', color: '#111827', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px rgba(0,0,0,0.2)', transition: 'all 0.2s' },
  buttonDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  error: { background: 'rgba(239, 68, 68, 0.8)', color: '#ffffff', fontSize: '1.1rem', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: 700 },
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
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const email = e.target.email.value;
    const password = e.target.password.value;
    try {
      setLoading(true);
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>

        {/* Logo + Title */}
        <div style={styles.header}>
          <img src="/Sailing/Club Logo.jpg" alt="CGSC Logo" style={styles.logo} />
          <h1 style={styles.title}>Welcome to CGSC</h1>
          <p style={styles.subtitle}>Where Sailors Meet Adventures</p>
        </div>

        {/* Ready to sail */}
        <div style={styles.section}>
          <p style={{...styles.sectionTitle, marginBottom: '0.75rem'}}>Ready to sail? 🌊</p>
          <p style={styles.description}>
            You're part of a community of sailors at Coconut Grove Sailing Club. Whether you own a boat or love crewing, this app connects you with people and outings.
          </p>
        </div>

        {/* How It Works */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Here's How It Works</h2>

          <div style={styles.sectionBox}>
            <p style={{...styles.cardTitle, marginBottom: '0.75rem'}}>🙋 If you crew <span style={{color: '#e0f2fe', fontSize: '0.9rem'}}>(no boat needed)</span></p>
            <p style={styles.description}>
              Browse upcoming sailings → Find one that fits your schedule → Request to join → Skipper approves → You're in! Chat with your crew before you go, share photos after.
            </p>
          </div>

          <div style={styles.sectionBox}>
            <p style={{...styles.cardTitle, marginBottom: '0.75rem'}}>🚢 If you own a boat</p>
            <p style={styles.description}>
              Post your upcoming outing → Crew members request to join → You pick who comes → Manage everything from your dashboard.
            </p>
          </div>
        </div>

        {/* What You Can Do */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>What You Can Do Right Now</h2>
          {[
            { emoji: '🧭', title: 'Browse Outings', desc: 'See all upcoming sails. Tap any one to learn more.' },
            { emoji: '⛵', title: 'Request to Join', desc: 'Found one you like? Ask the skipper if you can crew.' },
            { emoji: '👥', title: 'See Your Crew', desc: 'Once approved, chat and share photos with your crew.' },
            { emoji: '📋', title: 'Manage Your Boat', desc: 'Owners can post outings and approve crew from the "My Outings" tab.' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} style={styles.card}>
              <span style={styles.emoji}>{emoji}</span>
              <div>
                <p style={styles.cardTitle}>{title}</p>
                <p style={styles.cardDesc}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Getting Started */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Getting Started</h2>
          {[
            { n: '1️⃣', text: 'Complete your profile — Add a photo and tell us about your sailing experience.' },
            { n: '2️⃣', text: 'Browse outings — Tap "Outings" to see what\'s sailing this week.' },
            { n: '3️⃣', text: 'Request to join — Found something fun? Request it. Skippers respond fast.' },
            { n: '4️⃣', text: 'Show up and sail — That\'s it. Enjoy the water.' },
          ].map(({ n, text }) => (
            <div key={n} style={{display: 'flex', alignItems: 'flex-start', gap: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.2)', marginBottom: '0.75rem'}}>
              <span style={{fontSize: '1.375rem', flexShrink: 0}}>{n}</span>
              <p style={{color: '#ffffff', fontSize: '1.125rem', fontWeight: 600, lineHeight: '1.5', margin: 0}}>{text}</p>
            </div>
          ))}
        </div>

        {/* Sign In Form */}
        <div style={{marginBottom: '1.5rem'}}>
          <h2 style={{...styles.sectionTitle, textAlign: 'center', marginBottom: '2rem'}}>Sign In</h2>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            <div>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
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
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Sign Up CTA */}
        <div style={{textAlign: 'center', paddingBottom: '2.5rem'}}>
          <p style={styles.signUpText}>Don't have an account?</p>
          <Link to="/signup" style={styles.signUpLink}>
            Create Account →
          </Link>
        </div>

      </div>
    </div>
  );
}
