import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { formatLocalDate, todayLocalDateString } from '../utils/dateUtils';

const styles = {
  container: { maxWidth: '900px', margin: '0 auto', display: 'grid', gap: '12px' },
  back: { width: 'fit-content', background: '#e0f2fe', border: '2px solid #0369a1', color: '#0369a1', padding: '9px 12px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' },
  header: { background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)', color: '#ffffff', borderRadius: '8px', padding: '16px' },
  title: { margin: '0 0 5px', fontSize: '1.55rem', fontWeight: 900 },
  meta: { margin: '0 0 6px', color: '#dbeafe', fontWeight: 800 },
  text: { margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.45 },
  card: { background: '#ffffff', border: '1px solid #dbeafe', borderRadius: '8px', padding: '14px' },
  chat: { display: 'flex', flexDirection: 'column', gap: '9px', maxHeight: '52vh', overflowY: 'auto', padding: '4px' },
  bubble: { maxWidth: '86%', padding: '10px 12px', borderRadius: '8px', whiteSpace: 'pre-wrap', lineHeight: 1.4 },
  own: { alignSelf: 'flex-end', background: '#0369a1', color: '#ffffff' },
  other: { alignSelf: 'flex-start', background: '#e5e7eb', color: '#1f2937' },
  author: { border: 0, padding: 0, background: 'none', color: 'inherit', textDecoration: 'underline', fontWeight: 900, cursor: 'pointer' },
  preview: { marginTop: '9px', background: '#ffffff', color: '#0f172a', border: '2px solid #38bdf8', borderRadius: '7px', padding: '9px', cursor: 'pointer', width: '100%', textAlign: 'left' },
  previewTitle: { display: 'block', color: '#0369a1', fontWeight: 900, marginBottom: '3px' },
  composer: { display: 'grid', gap: '9px' },
  textarea: { width: '100%', minHeight: '80px', resize: 'vertical', border: '2px solid #94a3b8', borderRadius: '7px', padding: '10px', font: 'inherit' },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  button: { border: 0, borderRadius: '7px', padding: '10px 13px', fontWeight: 900, cursor: 'pointer' },
  primary: { background: '#0369a1', color: '#ffffff' },
  secondary: { background: '#e0f2fe', color: '#0369a1', border: '2px solid #0369a1' },
  danger: { background: '#dc2626', color: '#ffffff' },
  input: { width: '100%', border: '2px solid #94a3b8', borderRadius: '7px', padding: '9px', font: 'inherit' },
  adminGrid: { display: 'grid', gap: '9px' },
  error: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', borderRadius: '7px', padding: '10px', fontWeight: 800 },
};

const openSpots = (message) => Math.max(
  Number(message.linked_outing_capacity || 0) - Number(message.linked_outing_approved_count || 0),
  0
);

export default function ClubEventChatPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [event, setEvent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [outings, setOutings] = useState([]);
  const [message, setMessage] = useState('');
  const [linkedOutingId, setLinkedOutingId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', event_date: '', location: '', description: '' });

  const loadEvent = useCallback(async () => {
    try {
      setError('');
      const { data, error: loadError } = await supabase.rpc('active_club_event_chat');
      if (loadError) throw loadError;
      const rows = data || [];
      if (!rows.length) {
        setEvent(null);
        setMessages([]);
        return;
      }
      const first = rows[0];
      setEvent({
        id: first.event_id,
        title: first.event_title,
        event_date: first.event_date,
        location: first.event_location,
        description: first.event_description,
        status: first.event_status,
      });
      setEventForm({
        title: first.event_title || '',
        event_date: first.event_date || '',
        location: first.event_location || '',
        description: first.event_description || '',
      });
      setMessages(rows.filter((row) => row.message_id));
      await supabase.rpc('mark_club_event_seen', { p_event_id: first.event_id });
      window.dispatchEvent(new Event('sailing:club-event-chat-updated'));
    } catch (err) {
      setError(err.message || 'Could not load Upcoming Rendezvous');
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadEvent, 0);
    const channel = supabase.channel('club-event-chat-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_event_messages' }, loadEvent)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_events' }, loadEvent)
      .subscribe();
    return () => {
      window.clearTimeout(initialLoad);
      supabase.removeChannel(channel);
    };
  }, [loadEvent]);

  useEffect(() => {
    if (!user) return;
    const loadOutings = async () => {
      const query = supabase
        .from('outings')
        .select('id, title, outing_date, outing_time, capacity_available, boats(name)')
        .gte('outing_date', todayLocalDateString())
        .order('outing_date', { ascending: true });
      if (!isAdmin) query.eq('skipper_id', user.id);
      const { data } = await query;
      setOutings(data || []);
    };
    loadOutings();
  }, [user, isAdmin]);

  const selectedOuting = useMemo(
    () => outings.find((outing) => outing.id === linkedOutingId),
    [outings, linkedOutingId]
  );

  const saveEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.event_date) {
      setError('Event title and date are required.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      if (event) {
        const { error: updateError } = await supabase.from('club_events').update({
          title: eventForm.title.trim(),
          event_date: eventForm.event_date,
          location: eventForm.location.trim() || null,
          description: eventForm.description.trim() || null,
          updated_at: new Date().toISOString(),
        }).eq('id', event.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('club_events').insert({
          ...eventForm,
          title: eventForm.title.trim(),
          location: eventForm.location.trim() || null,
          description: eventForm.description.trim() || null,
          created_by: user.id,
        });
        if (insertError) throw insertError;
      }
      await loadEvent();
    } catch (err) {
      setError(err.message || 'Could not save Upcoming Rendezvous');
    } finally {
      setSaving(false);
    }
  };

  const archiveEvent = async () => {
    if (!event || !window.confirm('Close and archive this Upcoming Rendezvous? Members will no longer be able to post.')) return;
    const { error: archiveError } = await supabase.from('club_events').update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', event.id);
    if (archiveError) setError(archiveError.message);
    else await loadEvent();
  };

  const sendMessage = async () => {
    if (!event || !message.trim()) return;
    try {
      setSaving(true);
      const { error: sendError } = await supabase.from('club_event_messages').insert({
        event_id: event.id,
        user_id: user.id,
        message: message.trim(),
        linked_outing_id: linkedOutingId || null,
      });
      if (sendError) throw sendError;
      setMessage('');
      setLinkedOutingId('');
      await loadEvent();
    } catch (err) {
      setError(err.message || 'Could not post message');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <button type="button" onClick={() => navigate(-1)} style={styles.back}>← Back</button>
      {error && <div style={styles.error}>{error}</div>}

      {event ? (
        <>
          <section style={styles.header}>
            <h1 style={styles.title}>📣 {event.title}</h1>
            <p style={styles.meta}>
              {formatLocalDate(event.event_date)}{event.location ? ` · ${event.location}` : ''}
            </p>
            {event.description && <p style={styles.text}>{event.description}</p>}
          </section>

          {isAdmin && (
            <section style={styles.card}>
              <div style={styles.adminGrid}>
                <input style={styles.input} value={eventForm.title} onChange={(e) => setEventForm((v) => ({ ...v, title: e.target.value }))} placeholder="Event title" />
                <input style={styles.input} type="date" value={eventForm.event_date} onChange={(e) => setEventForm((v) => ({ ...v, event_date: e.target.value }))} />
                <input style={styles.input} value={eventForm.location} onChange={(e) => setEventForm((v) => ({ ...v, location: e.target.value }))} placeholder="Location" />
                <textarea style={styles.textarea} value={eventForm.description} onChange={(e) => setEventForm((v) => ({ ...v, description: e.target.value }))} placeholder="Event details" />
                <div style={styles.actions}>
                  <button type="button" onClick={saveEvent} style={{...styles.button, ...styles.primary}}>Save Event Details</button>
                  <button type="button" onClick={archiveEvent} style={{...styles.button, ...styles.danger}}>Close Rendezvous</button>
                </div>
              </div>
            </section>
          )}

          <section style={styles.card}>
            <div style={styles.chat}>
              {!messages.length && <p style={{color: '#64748b', textAlign: 'center'}}>No messages yet. Start the conversation.</p>}
              {messages.map((item) => (
                <div key={item.message_id} style={{...styles.bubble, ...(item.sender_id === user.id ? styles.own : styles.other)}}>
                  {item.sender_id !== user.id && (
                    <button type="button" style={styles.author} onClick={() => navigate(`/profile/${item.sender_id}?returnTo=${encodeURIComponent('/event-chat')}`)}>
                      {item.sender_name || 'Member'}
                    </button>
                  )}
                  <div>{item.message_text}</div>
                  {item.linked_outing_id && (
                    <button type="button" style={styles.preview} onClick={() => navigate(`/outing/${item.linked_outing_id}?returnTo=${encodeURIComponent('/event-chat')}`)}>
                      <span style={styles.previewTitle}>⛵ {item.linked_outing_title}</span>
                      <span>{formatLocalDate(item.linked_outing_date)} · {item.linked_boat_name || 'Boat TBD'} · {openSpots(item)} spots available</span>
                    </button>
                  )}
                  <div style={{fontSize: '0.72rem', opacity: 0.7, marginTop: '5px'}}>{new Date(item.message_created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <div style={styles.composer}>
              <textarea style={styles.textarea} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Post to all SailAway members..." />
              {!!outings.length && (
                <select style={styles.input} value={linkedOutingId} onChange={(e) => setLinkedOutingId(e.target.value)}>
                  <option value="">No outing link</option>
                  {outings.map((outing) => (
                    <option key={outing.id} value={outing.id}>{outing.title} · {formatLocalDate(outing.outing_date)}</option>
                  ))}
                </select>
              )}
              {selectedOuting && <div style={{color: '#475569', fontWeight: 700}}>Linked outing: {selectedOuting.title}</div>}
              <button type="button" onClick={sendMessage} disabled={saving || !message.trim()} style={{...styles.button, ...styles.primary, opacity: saving || !message.trim() ? 0.55 : 1}}>Post Message</button>
            </div>
          </section>
        </>
      ) : isAdmin ? (
        <section style={styles.card}>
          <h1 style={{marginTop: 0}}>Create the Upcoming Rendezvous</h1>
          <div style={styles.adminGrid}>
            <input style={styles.input} value={eventForm.title} onChange={(e) => setEventForm((v) => ({ ...v, title: e.target.value }))} placeholder="Event title" />
            <input style={styles.input} type="date" value={eventForm.event_date} onChange={(e) => setEventForm((v) => ({ ...v, event_date: e.target.value }))} />
            <input style={styles.input} value={eventForm.location} onChange={(e) => setEventForm((v) => ({ ...v, location: e.target.value }))} placeholder="Location" />
            <textarea style={styles.textarea} value={eventForm.description} onChange={(e) => setEventForm((v) => ({ ...v, description: e.target.value }))} placeholder="Event details" />
            <button type="button" onClick={saveEvent} style={{...styles.button, ...styles.primary}}>Create Rendezvous Chat</button>
          </div>
        </section>
      ) : (
        <section style={styles.card}><h1 style={{marginTop: 0}}>No Upcoming Rendezvous</h1><p>Admin will open the next club-wide Rendezvous conversation here.</p></section>
      )}
    </div>
  );
}
