import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom right, #0c3880, #0369a1, #06b6d4)', padding: '24px' },
  card: { width: '100%', maxWidth: '460px', background: '#ffffff', borderRadius: '20px', padding: '32px', boxShadow: '0 20px 40px rgba(15,23,42,0.28)', textAlign: 'center' },
  title: { margin: '0 0 12px', fontSize: '2rem', fontWeight: 900, color: '#0c2340' },
  text: { margin: '0 0 24px', color: '#475569', fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.5 },
  button: { display: 'block', background: '#0369a1', color: '#ffffff', textDecoration: 'none', padding: '14px 18px', borderRadius: '10px', fontWeight: 900, fontSize: '1.1rem' },
};

export default function EmailConfirmedPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const clearConfirmationSession = async () => {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      setReady(true);
    };

    clearConfirmationSession();
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Email Confirmed</h1>
        <p style={styles.text}>
          {ready
            ? 'Your account is verified. Please sign in to continue.'
            : 'Finishing confirmation...'}
        </p>
        {ready && <Link to="/login" style={styles.button}>Sign In</Link>}
      </div>
    </div>
  );
}
