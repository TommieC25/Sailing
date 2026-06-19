import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { formatLocalDate, todayLocalDateString } from '../utils/dateUtils';

const styles = {
  container: { maxWidth: '900px', margin: '0 auto', display: 'grid', gap: '14px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  title: { margin: 0, color: '#0c2340', fontSize: '1.6rem' },
  button: { border: 0, borderRadius: '7px', padding: '10px 13px', fontWeight: 900, cursor: 'pointer' },
  primary: { background: '#0369a1', color: '#ffffff' },
  secondary: { background: '#e0f2fe', color: '#0369a1', border: '2px solid #0369a1' },
  card: { display: 'block', background: '#ffffff', border: '2px solid #bae6fd', borderRadius: '8px', padding: '14px', textDecoration: 'none', color: '#0f172a' },
  eventTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' },
  eventTitle: { margin: '0 0 4px', color: '#0c2340', fontSize: '1.15rem' },
  meta: { margin: 0, color: '#0369a1', fontWeight: 800 },
  badge: { background: '#dc2626', color: '#ffffff', borderRadius: '999px', padding: '3px 8px', fontSize: '0.78rem', fontWeight: 900, whiteSpace: 'nowrap' },
  form: { display: 'grid', gap: '9px', background: '#ffffff', border: '2px solid #bae6fd', borderRadius: '8px', padding: '14px' },
  label: { display: 'grid', gap: '5px', color: '#334155', fontWeight: 900 },
  input: { width: '100%', border: '2px solid #94a3b8', borderRadius: '7px', padding: '9px', font: 'inherit' },
  textarea: { width: '100%', minHeight: '90px', resize: 'vertical', border: '2px solid #94a3b8', borderRadius: '7px', padding: '10px', font: 'inherit' },
  actions: { display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' },
  error: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', borderRadius: '7px', padding: '10px', fontWeight: 800 },
  empty: { background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '18px', color: '#64748b', textAlign: 'center' },
};

const emptyForm = () => ({ title: '', event_date: '', location: '', description: '' });

export default function ClubEventsPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [events, setEvents] = useState([]);
  const [unreadByEvent, setUnreadByEvent] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadEvents = useCallback(async () => {
    try {
      setError('');
      const [eventsResult, unreadResult] = await Promise.all([
        supabase
          .from('club_events')
          .select('id, title, event_date, location')
          .eq('status', 'active')
          .gte('event_date', todayLocalDateString())
          .order('event_date', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase.rpc('my_unread_club_event_counts'),
      ]);
      if (eventsResult.error) throw eventsResult.error;
      if (unreadResult.error) throw unreadResult.error;
      setEvents(eventsResult.data || []);
      setUnreadByEvent(Object.fromEntries((unreadResult.data || []).map((row) => [
        row.event_id,
        Number(row.unread_count || 0),
      ])));
    } catch (err) {
      setError(err.message || 'Could not load Club Rendezvous events');
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadEvents, 0);
    const channel = supabase.channel('club-events-directory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_events' }, loadEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_event_messages' }, loadEvents)
      .subscribe();
    return () => {
      window.clearTimeout(initialLoad);
      supabase.removeChannel(channel);
    };
  }, [loadEvents]);

  const createEvent = async () => {
    const title = form.title.trim();
    if (!title || !form.event_date) {
      setError('Event title and date are required.');
      return;
    }
    if (form.event_date < todayLocalDateString()) {
      setError('The Rendezvous date cannot be in the past.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const { data, error: insertError } = await supabase
        .from('club_events')
        .insert({
          title,
          event_date: form.event_date,
          location: form.location.trim() || null,
          description: form.description.trim() || null,
          created_by: user.id,
        })
        .select('id')
        .single();
      if (insertError) throw insertError;
      window.dispatchEvent(new Event('sailing:club-event-chat-updated'));
      navigate(`/event-chat/${data.id}`);
    } catch (err) {
      setError(err.message || 'Could not create Club Rendezvous');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📣 Club Rendezvous</h1>
        {isAdmin && !showCreate && (
          <button type="button" onClick={() => setShowCreate(true)} style={{ ...styles.button, ...styles.primary }}>
            Create Rendezvous
          </button>
        )}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {showCreate && isAdmin && (
        <section style={styles.form}>
          <h2 style={{ margin: 0, color: '#0c2340', fontSize: '1.2rem' }}>New Club Rendezvous</h2>
          <label style={styles.label}>
            Event title
            <input style={styles.input} value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} />
          </label>
          <label style={styles.label}>
            Event date
            <input style={styles.input} type="date" min={todayLocalDateString()} value={form.event_date} onChange={(e) => setForm((current) => ({ ...current, event_date: e.target.value }))} />
          </label>
          <label style={styles.label}>
            Location
            <input style={styles.input} value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} />
          </label>
          <label style={styles.label}>
            Event details
            <textarea style={styles.textarea} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} />
          </label>
          <div style={styles.actions}>
            <button type="button" onClick={() => { setShowCreate(false); setForm(emptyForm()); setError(''); }} disabled={saving} style={{ ...styles.button, ...styles.secondary }}>Cancel</button>
            <button type="button" onClick={createEvent} disabled={saving} style={{ ...styles.button, ...styles.primary, opacity: saving ? 0.6 : 1 }}>Create Rendezvous</button>
          </div>
        </section>
      )}

      {!events.length ? (
        <div style={styles.empty}>No upcoming Club Rendezvous events have been posted.</div>
      ) : events.map((event) => {
        const unreadCount = unreadByEvent[event.id] || 0;
        return (
          <button key={event.id} type="button" onClick={() => navigate(`/event-chat/${event.id}`)} style={{ ...styles.card, width: '100%', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}>
            <div style={styles.eventTop}>
              <div>
                <h2 style={styles.eventTitle}>{event.title}</h2>
                <p style={styles.meta}>{formatLocalDate(event.event_date)}{event.location ? ` · ${event.location}` : ''}</p>
              </div>
              {unreadCount > 0 && <span style={styles.badge}>{unreadCount} new</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
