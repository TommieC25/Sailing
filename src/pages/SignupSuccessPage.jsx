import { useLocation, Navigate } from 'react-router-dom';

const styles = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(to bottom right, #0c3880, #0369a1, #06b6d4)', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '2rem', paddingBottom: '2rem' },
  innerContainer: { flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '448px', margin: '0 auto', width: '100%', justifyContent: 'center' },
  header: { textAlign: 'center', marginBottom: '2.5rem' },
  logo: { height: '112px', width: 'auto', margin: '0 auto 1rem 0', filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.3))' },
  title: { fontSize: '3rem', fontWeight: 900, color: '#ffffff', margin: '0 0 0.5rem 0', textShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  card: { background: '#ffffff', borderRadius: '24px', boxShadow: '0 20px 25px rgba(0,0,0,0.2)', padding: '32px' },
  cardTitle: { fontSize: '2.25rem', fontWeight: 900, textAlign: 'center', marginBottom: '32px', color: '#1e3a8a', margin: '0 0 32px 0' },
  bigText: { fontSize: '1.25rem', color: '#1e3a8a', fontWeight: 600, lineHeight: 1.5, marginBottom: '1.5rem' },
  midText: { fontSize: '1.125rem', color: '#374151', fontWeight: 600, lineHeight: 1.5, marginBottom: '2rem' },
  smallText: { fontSize: '1rem', color: '#6b7280', fontWeight: 500, lineHeight: 1.5, marginBottom: '2rem' },
  bottomText: { color: '#ffffff', textAlign: 'center', fontSize: '1.125rem', fontWeight: 600, marginTop: '2rem', textShadow: '0 1px 3px rgba(0,0,0,0.4)' },
};

export default function SignupSuccessPage() {
  const location = useLocation();
  const email =
    location.state?.email ||
    new URLSearchParams(location.search).get('email') ||
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('signupEmail'));

  if (!email) {
    return <Navigate to="/signup" replace />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.innerContainer}>
        <div style={styles.header}>
          <img src="/Sailing/Club Logo.jpg" alt="CGSC Logo" style={styles.logo} />
          <h1 style={styles.title}>Check Your Email</h1>
        </div>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>One more step!</h2>
          <p style={styles.bigText}>
            We sent a confirmation link to <strong>{email}</strong>.
          </p>
          <p style={styles.midText}>
            Click the link in the email to verify your account. SailAway will then show the Sign In button.
          </p>
          <p style={styles.smallText}>
            Don't see it? Check your spam folder. The email comes from <strong>noreply@mail.app.supabase.io</strong>.
          </p>
        </div>
        <p style={styles.bottomText}>Coconut Grove Sailing Club • Miami, FL</p>
      </div>
    </div>
  );
}
