import { Link } from 'react-router-dom';

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(to bottom right, #0c3880, #0369a1, #06b6d4)', padding: '28px 18px' },
  content: { maxWidth: '760px', margin: '0 auto' },
  header: { textAlign: 'center', marginBottom: '22px' },
  logo: { height: '105px', width: 'auto', margin: '0 auto 14px', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.28))' },
  title: { color: '#ffffff', fontSize: '2.7rem', fontWeight: 900, lineHeight: 1.05, margin: 0, textShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  subtitle: { color: '#cffafe', fontSize: '1.15rem', fontWeight: 750, lineHeight: 1.5, margin: '14px auto 0', maxWidth: '650px' },
  sectionTitle: { color: '#ffffff', fontSize: '1.55rem', fontWeight: 900, margin: '22px 0 10px' },
  cards: { display: 'grid', gap: '10px' },
  card: { background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', padding: '14px' },
  cardTitle: { color: '#ffffff', fontSize: '1.18rem', fontWeight: 900, margin: '0 0 5px' },
  cardText: { color: '#e0f2fe', fontSize: '1rem', fontWeight: 650, lineHeight: 1.45, margin: 0 },
  step: { display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '9px', padding: '11px 13px' },
  stepText: { color: '#ffffff', fontSize: '1rem', fontWeight: 700, lineHeight: 1.4, margin: 0 },
  actions: { display: 'grid', gap: '12px', marginTop: '24px', textAlign: 'center' },
  create: { display: 'block', background: '#ffffff', color: '#0c2340', padding: '15px', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 900, textDecoration: 'none', boxShadow: '0 10px 18px rgba(0,0,0,0.2)' },
  signIn: { color: '#ffffff', fontSize: '1rem', fontWeight: 850, textDecoration: 'underline', padding: '8px' },
};

export default function WelcomePage() {
  return (
    <div style={styles.container}>
      <main style={styles.content}>
        <header style={styles.header}>
          <img src="/Sailing/Club Logo.jpg" alt="CGSC Logo" style={styles.logo} />
          <h1 style={styles.title}>Sail Away<br />With CGSC!</h1>
          <p style={styles.subtitle}>
            SailAway connects Coconut Grove Sailing Club skippers and crew with outings, updates, and the people they will meet on the water.
          </p>
        </header>

        <h2 style={styles.sectionTitle}>Here's How It Works</h2>
        <section style={styles.cards}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>🚢 Skippers</h3>
            <p style={styles.cardText}>Post upcoming sails, review crew requests, approve who joins, and coordinate with your crew.</p>
          </div>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>⛵ Crew</h3>
            <p style={styles.cardText}>Browse upcoming outings, request to join, and connect with your skipper and fellow crew.</p>
          </div>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>💬 Outing Chat</h3>
            <p style={styles.cardText}>Stay connected before, during, and after each outing without turning SailAway into another social network.</p>
          </div>
        </section>

        <h2 style={styles.sectionTitle}>Getting Started</h2>
        <section style={styles.cards}>
          {[
            ['1️⃣', 'Create your account and confirm your email.'],
            ['2️⃣', 'Add a recognizable profile photo and sailing experience.'],
            ['3️⃣', 'Browse outings or post one as a skipper.'],
            ['4️⃣', 'Request to join, coordinate, and go sailing.'],
          ].map(([number, text]) => (
            <div key={number} style={styles.step}>
              <span>{number}</span>
              <p style={styles.stepText}>{text}</p>
            </div>
          ))}
        </section>

        <div style={styles.actions}>
          <Link to="/signup" style={styles.create}>Create Account</Link>
          <Link to="/login" style={styles.signIn}>Already have an account? Sign In</Link>
        </div>
      </main>
    </div>
  );
}
