import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CURRENT_WAIVER_VERSION, hasAcceptedCurrentWaiver, WAIVER_TEXT } from '../utils/waiver';

const styles = {
  page: { minHeight: '100vh', background: '#eef4f8', padding: '20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: '680px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '20px', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.1)' },
  title: { margin: '0 0 6px', color: '#0c2340', fontSize: '1.7rem', fontWeight: 900 },
  intro: { margin: '0 0 16px', color: '#475569', lineHeight: 1.45, fontWeight: 600 },
  waiver: { margin: '0 0 16px', background: '#f8fafc', border: '2px solid #94a3b8', borderRadius: '6px', padding: '16px', color: '#1e293b', lineHeight: 1.6, fontSize: '1rem' },
  agreement: { display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#fff7ed', border: '2px solid #f59e0b', borderRadius: '6px', padding: '14px', color: '#78350f', fontWeight: 800, lineHeight: 1.45 },
  checkbox: { width: '24px', height: '24px', flex: '0 0 auto', marginTop: '1px' },
  error: { marginTop: '12px', background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', borderRadius: '6px', padding: '12px', fontWeight: 800 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' },
  accept: { flex: '1 1 260px', minHeight: '48px', background: '#0369a1', color: '#ffffff', border: 0, borderRadius: '6px', padding: '12px 16px', fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer' },
  signOut: { minHeight: '48px', background: '#ffffff', color: '#334155', border: '2px solid #94a3b8', borderRadius: '6px', padding: '12px 16px', fontWeight: 900, cursor: 'pointer' },
};

export default function WaiverAcceptancePage() {
  const navigate = useNavigate();
  const { profile, acceptWaiver, signOut } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const alreadyAccepted = hasAcceptedCurrentWaiver(profile);

  const handleAccept = async () => {
    if (!accepted) {
      setError('Please check the acknowledgment box before continuing.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await acceptWaiver(CURRENT_WAIVER_VERSION);
    } catch (err) {
      setError(err.message || 'Could not record your acceptance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>Waiver, Release & Disclaimer of Liability</h1>
        <p style={styles.intro}>
          {alreadyAccepted
            ? `You accepted this version on ${new Date(profile.waiver_accepted_at).toLocaleString()}.`
            : 'You must review and accept this agreement before using SailAway with CGSC.'}
        </p>

        <div style={styles.waiver}>{WAIVER_TEXT}</div>

        {!alreadyAccepted && (
          <label style={styles.agreement}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              style={styles.checkbox}
            />
            <span>I have read, understand, and agree to this Waiver, Release & Disclaimer of Liability.</span>
          </label>
        )}

        {error && <div role="alert" style={styles.error}>{error}</div>}

        <div style={styles.actions}>
          {alreadyAccepted ? (
            <button type="button" onClick={() => navigate(-1)} style={styles.accept}>Back</button>
          ) : (
            <>
              <button type="button" onClick={handleAccept} disabled={saving} style={{...styles.accept, opacity: saving ? 0.6 : 1}}>
                {saving ? 'Recording Acceptance...' : 'Accept & Continue'}
              </button>
              <button type="button" onClick={signOut} style={styles.signOut}>Sign Out</button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
