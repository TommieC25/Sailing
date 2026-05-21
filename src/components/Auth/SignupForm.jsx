import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const styles = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(to bottom right, #0c3880, #0369a1, #06b6d4)', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '2rem', paddingBottom: '2rem' },
  innerContainer: { flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '448px', margin: '0 auto', width: '100%', justifyContent: 'center' },
  header: { textAlign: 'center', marginBottom: '2.5rem' },
  logo: { height: '112px', width: 'auto', margin: '0 auto 1rem 0', filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.3))' },
  title: { fontSize: '3rem', fontWeight: 900, color: '#ffffff', margin: '0 0 0.5rem 0', textShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  subtitle: { fontSize: '1.5rem', fontWeight: 600, color: '#e0f2fe', margin: 0 },
  card: { background: '#ffffff', borderRadius: '24px', boxShadow: '0 20px 25px rgba(0,0,0,0.2)', padding: '32px' },
  cardTitle: { fontSize: '2.25rem', fontWeight: 900, textAlign: 'center', marginBottom: '32px', color: '#1e3a8a', margin: '0 0 32px 0' },
  errorBox: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', fontSize: '1.125rem', paddingX: '1.25rem', paddingY: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 600, padding: '1rem 1.25rem' },
  form: { display: 'grid', gap: '1.5rem' },
  fieldGroup: { display: 'grid', gap: '12px' },
  label: { display: 'block', fontSize: '1.5rem', fontWeight: 900, color: '#1e3a8a', marginBottom: '0.75rem' },
  input: { width: '100%', paddingX: '1.25rem', paddingY: '1rem', border: '3px solid #93c5fd', borderRadius: '12px', color: '#1e3a8a', fontSize: '1.5rem', fontWeight: 600, padding: '1rem 1.25rem', fontFamily: 'inherit' },
  select: { width: '100%', paddingX: '1.25rem', paddingY: '1rem', border: '3px solid #93c5fd', borderRadius: '12px', color: '#1e3a8a', fontSize: '1.5rem', fontWeight: 600, background: '#ffffff', padding: '1rem 1.25rem', fontFamily: 'inherit' },
  button: { width: '100%', paddingY: '1.25rem', borderRadius: '12px', fontWeight: 900, color: '#ffffff', fontSize: '1.5rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 15px rgba(0,0,0,0.2)' },
  footer: { marginTop: '2rem', paddingTop: '1.5rem', borderTop: '3px solid #e5e7eb' },
  footerText: { color: '#374151', fontSize: '1.25rem', fontWeight: 700, textAlign: 'center', marginBottom: '1rem', margin: '0 0 1rem 0' },
  signInLink: { display: 'block', width: '100%', paddingY: '1.25rem', borderRadius: '12px', fontWeight: 900, color: '#1e3a8a', fontSize: '1.5rem', border: '3px solid #1e3a8a', textAlign: 'center', textDecoration: 'none', transition: 'all 0.2s' },
  bottomText: { color: '#ffffff', textAlign: 'center', fontSize: '1.125rem', fontWeight: 600, marginTop: '2rem', textShadow: '0 1px 3px rgba(0,0,0,0.4)' },
};

export default function SignupForm() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    gender: '',
    userType: 'crew',
    sailingExperience: 'beginner',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!formData.gender) {
      setError('Please select your gender');
      return;
    }
    try {
      setLoading(true);
      await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        gender: formData.gender,
        user_type: formData.userType,
        sailing_experience: formData.sailingExperience,
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.innerContainer}>

        {/* Logo */}
        <div style={styles.header}>
          <img src="/Sailing/Club Logo.jpg" alt="CGSC Logo" style={styles.logo} />
          <h1 style={styles.title}>Set Sail</h1>
          <p style={styles.subtitle}>Find outings and crew • Connect with sailors</p>
        </div>

        {/* Form Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Create Account</h2>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="Your full name"
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                style={styles.select}
              >
                <option value="">Select gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div style={styles.fieldGroup}>
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

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Min 6 characters"
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Type it again"
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>I am a...</label>
              <select
                name="userType"
                value={formData.userType}
                onChange={handleChange}
                style={styles.select}
              >
                <option value="crew">Crew Member</option>
                <option value="owner">Boat Owner / Skipper</option>
              </select>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Experience Level</label>
              <select
                name="sailingExperience"
                value={formData.sailingExperience}
                onChange={handleChange}
                style={styles.select}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)',
                opacity: loading ? 0.5 : 1
              }}
              onMouseEnter={(e) => !loading && (e.target.style.boxShadow = '0 15px 25px rgba(0,0,0,0.3)')}
              onMouseLeave={(e) => (e.target.style.boxShadow = '0 10px 15px rgba(0,0,0,0.2)')}
            >
              {loading ? 'Creating Account...' : 'Create Account →'}
            </button>
          </form>

          <div style={styles.footer}>
            <p style={styles.footerText}>Already have an account?</p>
            <Link
              to="/login"
              style={styles.signInLink}
              onMouseEnter={(e) => e.target.style.background = '#eff6ff'}
              onMouseLeave={(e) => e.target.style.background = '#ffffff'}
            >
              Sign In →
            </Link>
          </div>
        </div>

        <p style={styles.bottomText}>Coconut Grove Sailing Club • Miami, FL</p>
      </div>
    </div>
  );
}
