import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AuthorMessageActions from '../components/AuthorMessageActions';
import CalendarActions from '../components/CalendarActions';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { formatLocalDate, formatLocalTime, todayLocalDateString } from '../utils/dateUtils';

const styles = {
  container: { maxWidth: '900px', margin: '0 auto', display: 'grid', gap: '12px' },
  back: { width: 'fit-content', background: '#e0f2fe', border: '2px solid #0369a1', color: '#0369a1', padding: '9px 12px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' },
  header: { background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)', color: '#ffffff', borderRadius: '8px', padding: '16px' },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  title: { margin: 0, fontSize: '1.35rem', fontWeight: 900 },
  details: { marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.35)' },
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
  composerActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  textarea: { width: '100%', minHeight: '80px', resize: 'vertical', border: '2px solid #94a3b8', borderRadius: '7px', padding: '10px', font: 'inherit' },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  button: { border: 0, borderRadius: '7px', padding: '10px 13px', fontWeight: 900, cursor: 'pointer' },
  primary: { background: '#0369a1', color: '#ffffff' },
  secondary: { background: '#e0f2fe', color: '#0369a1', border: '2px solid #0369a1' },
  moderate: { background: '#fef3c7', color: '#92400e', border: '2px solid #f59e0b' },
  danger: { background: '#dc2626', color: '#ffffff' },
  input: { width: '100%', border: '2px solid #94a3b8', borderRadius: '7px', padding: '9px', font: 'inherit' },
  label: { display: 'grid', gap: '5px', color: '#334155', fontWeight: 900 },
  adminGrid: { display: 'grid', gap: '9px' },
  error: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', borderRadius: '7px', padding: '10px', fontWeight: 800 },
};

const openSpots = (message) => Math.max(
  Number(message.linked_outing_capacity || 0) - Number(message.linked_outing_approved_count || 0),
  0
);

export default function ClubEventChatPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [event, setEvent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [outings, setOutings] = useState([]);
  const [message, setMessage] = useState('');
  const [showOutingLinker, setShowOutingLinker] = useState(false);
  const [linkedOutingId, setLinkedOutingId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', event_date: '', event_time: '', location: '', description: '' });

  const loadEvent = useCallback(async () => {
    try {
      setError('');
      const { data, error: loadError } = await supabase.rpc('club_event_chat', { p_event_id: eventId });
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
        event_time: first.event_time,
        location: first.event_location,
        description: first.event_description,
        status: first.event_status,
      });
      setEventForm({
        title: first.event_title || '',
        event_date: first.event_date || '',
        event_time: first.event_time?.slice(0, 5) || '',
        location: first.event_location || '',
        description: first.event_description || '',
      });
      setMessages(rows.filter((row) => row.message_id));
      await supabase.rpc('mark_club_event_seen', { p_event_id: first.event_id });
      window.dispatchEvent(new Event('sailing:club-event-chat-updated'));
    } catch (err) {
      setError(err.message || 'Could not load Upcoming Rendezvous');
    }
  }, [eventId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadEvent, 0);
    const channel = supabase.channel('club-event-chat-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_event_messages', filter: `event_id=eq.${eventId}` }, loadEvent)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_events', filter: `id=eq.${eventId}` }, loadEvent)
      .subscribe();
    return () => {
      window.clearTimeout(initialLoad);
      supabase.removeChannel(channel);
    };
  }, [eventId, loadEvent]);

  useEffect(() => {
    if (!user) return;
    const loadOutings = async () => {
      const query = supabase
        .from('outings')
        .select('id, title, outing_date, outing_time, capacity_available, boats(name)')
        .eq('skipper_id', user.id)
        .gte('outing_date', todayLocalDateString())
        .order('outing_date', { ascending: true });
      const { data } = await query;
      setOutings(data || []);
    };
    loadOutings();
  }, [user]);

  const selectedOuting = useMemo(
    () => outings.find((outing) => outing.id === linkedOutingId),
    [outings, linkedOutingId]
  );
  const hasLinkedOuting = messages.some((item) => (
    item.sender_id === user?.id && item.linked_outing_id
  ));
  const canLinkOuting = outings.length > 0 && !hasLinkedOuting;

  const saveEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.event_date || !eventForm.event_time) {
      setError('Event title, date, and time are required.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const { error: updateError } = await supabase.from('club_events').update({
        title: eventForm.title.trim(),
        event_date: eventForm.event_date,
        event_time: eventForm.event_time,
        location: eventForm.location.trim() || null,
        description: eventForm.description.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', event.id);
      if (updateError) throw updateError;
      await loadEvent();
      setIsEditingEvent(false);
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
    else {
      window.dispatchEvent(new Event('sailing:club-event-chat-updated'));
      navigate('/event-chat');
    }
  };

  const cancelEventEdit = () => {
    setEventForm({
      title: event.title || '',
      event_date: event.event_date || '',
      event_time: event.event_time?.slice(0, 5) || '',
      location: event.location || '',
      description: event.description || '',
    });
    setIsEditingEvent(false);
    setError('');
  };

  const sendMessage = async () => {
    if (!event || !message.trim()) return;
    if (showOutingLinker && !linkedOutingId) {
      setError('Select your outing, or close the outing link option.');
      return;
    }
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
      setShowOutingLinker(false);
      setLinkedOutingId('');
      await loadEvent();
    } catch (err) {
      setError(err.message || 'Could not post message');
    } finally {
      setSaving(false);
    }
  };

  const editMessage = async (messageId, text) => {
    const { error: editError } = await supabase.rpc('edit_authored_message', {
      p_kind: 'club_event_chat',
      p_id: messageId,
      p_text: text,
    });
    if (editError) {
      setError(editError.message);
      throw editError;
    }
    await loadEvent();
  };

  const deleteMessage = async (messageId) => {
    const { error: deleteError } = await supabase.rpc('delete_authored_message', {
      p_kind: 'club_event_chat',
      p_id: messageId,
    });
    if (deleteError) {
      setError(deleteError.message);
      throw deleteError;
    }
    await loadEvent();
  };

  const moderateDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message as moderator? This cannot be undone.')) return;
    await deleteMessage(messageId);
  };

  return (
    <div style={styles.container}>
      <button type="button" onClick={() => navigate('/event-chat')} style={styles.back}>← All Rendezvous</button>
      {error && <div style={styles.error}>{error}</div>}

      {event ? (
        <>
          <section style={styles.header}>
            <div style={styles.headerRow}>
              <h1 style={styles.title}>📣 {event.title}</h1>
              <div style={styles.headerActions}>
                <button
                  type="button"
                  onClick={() => {
                    if (showEventDetails) {
                      if (isEditingEvent) cancelEventEdit();
                      setShowEventDetails(false);
                    } else {
                      setShowEventDetails(true);
                    }
                  }}
                  aria-expanded={showEventDetails}
                  style={{ ...styles.button, ...styles.secondary, padding: '7px 10px' }}
                >
                  {showEventDetails ? 'Hide Details' : 'Event Details'}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsModerating((current) => !current)}
                    aria-pressed={isModerating}
                    style={{ ...styles.button, ...styles.moderate, padding: '7px 10px' }}
                  >
                    {isModerating ? 'Done Moderating' : 'Moderate Chat'}
                  </button>
                )}
              </div>
            </div>
            {showEventDetails && (
              <div style={styles.details}>
                <p style={styles.meta}>
                  {formatLocalDate(event.event_date)} · {event.event_time ? formatLocalTime(event.event_time) : 'Time TBD'}{event.location ? ` · ${event.location}` : ''}
                </p>
                {event.description && <p style={styles.text}>{event.description}</p>}
                <CalendarActions event={{
                  title: event.title,
                  date: event.event_date,
                  time: event.event_time,
                  location: event.location,
                  description: event.description,
                  url: `${window.location.origin}/Sailing/event-chat/${event.id}`,
                }} />
                {isAdmin && !isEditingEvent && (
                  <button
                    type="button"
                    onClick={() => setIsEditingEvent(true)}
                    style={{ ...styles.button, ...styles.secondary, marginTop: '12px', padding: '7px 10px' }}
                  >
                    Edit Event
                  </button>
                )}
              </div>
            )}
          </section>

          {isAdmin && isEditingEvent && (
            <section style={styles.card}>
              <div style={styles.adminGrid}>
                <label style={styles.label}>Event title<input style={styles.input} value={eventForm.title} onChange={(e) => setEventForm((v) => ({ ...v, title: e.target.value }))} /></label>
                <label style={styles.label}>Event date<input style={styles.input} type="date" value={eventForm.event_date} onChange={(e) => setEventForm((v) => ({ ...v, event_date: e.target.value }))} /></label>
                <label style={styles.label}>Event time<input style={styles.input} type="time" value={eventForm.event_time} onChange={(e) => setEventForm((v) => ({ ...v, event_time: e.target.value }))} /></label>
                <label style={styles.label}>Location<input style={styles.input} value={eventForm.location} onChange={(e) => setEventForm((v) => ({ ...v, location: e.target.value }))} /></label>
                <label style={styles.label}>Event details<textarea style={styles.textarea} value={eventForm.description} onChange={(e) => setEventForm((v) => ({ ...v, description: e.target.value }))} /></label>
                <div style={styles.actions}>
                  <button type="button" onClick={saveEvent} disabled={saving} style={{...styles.button, ...styles.primary}}>Save Event Details</button>
                  <button type="button" onClick={cancelEventEdit} disabled={saving} style={{...styles.button, ...styles.secondary}}>Cancel</button>
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
                    <button type="button" style={styles.author} onClick={() => navigate(`/profile/${item.sender_id}?returnTo=${encodeURIComponent(`/event-chat/${eventId}`)}`)}>
                      {item.sender_name || 'Member'}
                    </button>
                  )}
                  <div>{item.message_text}</div>
                  {item.linked_outing_id && (
                    <button type="button" style={styles.preview} onClick={() => navigate(`/outing/${item.linked_outing_id}?returnTo=${encodeURIComponent(`/event-chat/${eventId}`)}`)}>
                      <span style={styles.previewTitle}>⛵ {item.linked_outing_title}</span>
                      <span>{formatLocalDate(item.linked_outing_date)} · {item.linked_boat_name || 'Boat TBD'} · {openSpots(item)} spots available</span>
                    </button>
                  )}
                  <div style={{fontSize: '0.72rem', opacity: 0.7, marginTop: '5px'}}>{new Date(item.message_created_at).toLocaleString()}</div>
                  {item.sender_id === user.id ? (
                    <AuthorMessageActions
                      value={item.message_text}
                      onSave={(text) => editMessage(item.message_id, text)}
                      onDelete={() => deleteMessage(item.message_id)}
                    />
                  ) : isAdmin && isModerating && (
                    <div style={styles.actions}>
                      <button
                        type="button"
                        onClick={() => moderateDeleteMessage(item.message_id)}
                        style={{ ...styles.button, ...styles.danger, padding: '6px 9px', fontSize: '0.78rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <div style={styles.composer}>
              <textarea style={styles.textarea} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Post your message about this event..." />
              {showOutingLinker && canLinkOuting && (
                <label style={{display: 'grid', gap: '5px', color: '#334155', fontWeight: 900}}>
                  Link one of your outings
                  <select style={styles.input} value={linkedOutingId} onChange={(e) => setLinkedOutingId(e.target.value)}>
                    <option value="">Select your outing</option>
                    {outings.map((outing) => (
                      <option key={outing.id} value={outing.id}>{outing.title} · {formatLocalDate(outing.outing_date)}</option>
                    ))}
                  </select>
                </label>
              )}
              {selectedOuting && (
                <div style={{background: '#e0f2fe', border: '2px solid #38bdf8', borderRadius: '7px', padding: '9px', color: '#0c2340', fontWeight: 800}}>
                  This post will include a clickable link to: {selectedOuting.title}
                </div>
              )}
              <div style={styles.composerActions}>
                {canLinkOuting && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowOutingLinker((current) => !current);
                      setLinkedOutingId('');
                      setError('');
                    }}
                    style={{...styles.button, ...styles.secondary, padding: '8px 10px'}}
                  >
                    {showOutingLinker ? 'Cancel' : '🔗 Link my outing'}
                  </button>
                )}
                <button type="button" onClick={sendMessage} disabled={saving || !message.trim()} style={{...styles.button, ...styles.primary, marginLeft: 'auto', opacity: saving || !message.trim() ? 0.55 : 1}}>Post Message</button>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section style={styles.card}><h1 style={{marginTop: 0}}>Rendezvous unavailable</h1><p>This event has been closed or could not be found.</p></section>
      )}
    </div>
  );
}
