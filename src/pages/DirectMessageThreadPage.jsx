import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

const styles = {
  container: { maxWidth: '760px', margin: '0 auto' },
  backButton: { background: '#e0f2fe', border: '2px solid #0369a1', color: '#0369a1', fontWeight: 900, fontSize: '0.95rem', marginBottom: '10px', cursor: 'pointer', padding: '9px 12px', borderRadius: '8px' },
  header: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' },
  contextCard: { background: '#f8fafc', border: '1px solid #cbd5e1', borderLeft: '4px solid #0369a1', borderRadius: '10px', padding: '10px 12px', marginBottom: '10px' },
  contextTitle: { color: '#0f172a', fontSize: '0.98rem', fontWeight: 900, margin: '0 0 4px' },
  contextBody: { color: '#475569', fontSize: '0.88rem', fontWeight: 650, lineHeight: 1.35, margin: 0, whiteSpace: 'pre-wrap' },
  avatar: { width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', background: '#e0f2fe', flexShrink: 0 },
  avatarPlaceholder: { width: '38px', height: '38px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 },
  title: { color: '#0f172a', fontSize: '1.15rem', fontWeight: 900, margin: 0 },
  subtitle: { color: '#64748b', fontWeight: 700, fontSize: '0.86rem', margin: '2px 0 0' },
  thread: { display: 'grid', gap: '7px', marginBottom: '10px' },
  bubbleRow: { display: 'flex' },
  bubble: { maxWidth: '86%', borderRadius: '10px', padding: '8px 10px', border: '1px solid #e5e7eb' },
  ownBubble: { marginLeft: 'auto', background: '#0369a1', color: '#ffffff', borderColor: '#0369a1' },
  otherBubble: { marginRight: 'auto', background: '#ffffff', color: '#1e293b' },
  time: { fontSize: '0.72rem', opacity: 0.72, marginTop: '5px' },
  composer: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', display: 'grid', gap: '8px' },
  textarea: { width: '100%', minHeight: '68px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical' },
  sendButton: { padding: '9px 12px', border: 'none', borderRadius: '8px', background: '#0369a1', color: '#ffffff', fontSize: '0.95rem', fontWeight: 900, cursor: 'pointer' },
  error: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', padding: '12px', borderRadius: '8px', fontWeight: 800, marginBottom: '10px' },
  empty: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', color: '#64748b', fontWeight: 700, marginBottom: '10px' },
};

export default function DirectMessageThreadPage() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const contactMessageId = searchParams.get('contactMessage');
  const returnTo = searchParams.get('returnTo') || '/messages';
  const [member, setMember] = useState(null);
  const [contactMessage, setContactMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !memberId) return;

    const fetchThread = async () => {
      try {
        setLoading(true);
        setError('');

        const { data: memberData, error: memberError } = await supabase
          .from('public_profiles')
          .select('id, full_name, photo_url, user_type, sailing_experience')
          .eq('id', memberId)
          .maybeSingle();

        if (memberError) throw memberError;
        if (!memberData || memberData.id === user.id) throw new Error('Member not found');
        setMember(memberData);

        if (contactMessageId) {
          const { data: contactData, error: contactError } = await supabase
            .from('contact_messages')
            .select('id, subject, message, created_at, user_id')
            .eq('id', contactMessageId)
            .maybeSingle();

          if (contactError) throw contactError;
          if (!contactData) throw new Error('Message thread not found');
          setContactMessage(contactData);
        } else {
          setContactMessage(null);
        }

        let messagesQuery = supabase
          .from('direct_messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${memberId}),and(sender_id.eq.${memberId},recipient_id.eq.${user.id})`)
          .order('created_at', { ascending: true });

        messagesQuery = contactMessageId
          ? messagesQuery.eq('contact_message_id', contactMessageId)
          : messagesQuery.is('contact_message_id', null);

        const { data: messageData, error: messagesError } = await messagesQuery;

        if (messagesError) throw messagesError;
        setMessages(messageData || []);

        const unreadIds = (messageData || [])
          .filter((message) => message.recipient_id === user.id && !message.read_at)
          .map((message) => message.id);

        if (unreadIds.length > 0) {
          await supabase
            .from('direct_messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadIds);
          window.dispatchEvent(new Event('sailing:direct-messages-updated'));
        }
      } catch (err) {
        setError(err.message || 'Could not load conversation');
      } finally {
        setLoading(false);
      }
    };

    fetchThread();
  }, [user, memberId, contactMessageId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const body = draft;
    if (!body.trim() || !user || !member) return;

    try {
      setSending(true);
      setError('');

      const { data, error: sendError } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          recipient_id: member.id,
          body,
          contact_message_id: contactMessageId || null,
        })
        .select()
        .single();

      if (sendError) throw sendError;
      setMessages((current) => [...current, data]);
      setDraft('');
      window.dispatchEvent(new Event('sailing:direct-messages-updated'));
    } catch (err) {
      setError(err.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div style={styles.container}><div style={styles.empty}>Loading conversation...</div></div>;
  }

  if (error && !member) {
    return <div style={styles.container}><div style={styles.error}>{error}</div></div>;
  }

  return (
    <div style={styles.container}>
      <button type="button" onClick={() => navigate(returnTo)} style={styles.backButton}>
        Back
      </button>

      {member && (
        <button type="button" onClick={() => navigate(`/profile/${member.id}?returnTo=${encodeURIComponent(`/messages/${member.id}${contactMessageId ? `?contactMessage=${contactMessageId}` : ''}`)}`)} style={styles.header}>
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.full_name} style={styles.avatar} />
          ) : (
            <div style={styles.avatarPlaceholder}>👤</div>
          )}
          <div style={{ textAlign: 'left' }}>
            <h1 style={styles.title}>{member.full_name || 'Member'}</h1>
            <p style={styles.subtitle}>{[member.user_type, member.sailing_experience].filter(Boolean).join(' · ') || 'Member profile'}</p>
          </div>
        </button>
      )}

      {contactMessage && (
        <div style={styles.contextCard}>
          <p style={styles.contextTitle}>Replying to: {contactMessage.subject}</p>
          <p style={styles.contextBody}>{contactMessage.message}</p>
          <p style={{ ...styles.contextBody, marginTop: '6px', color: '#64748b', fontSize: '0.78rem' }}>
            Received {new Date(contactMessage.created_at).toLocaleString()}
          </p>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      {messages.length === 0 ? (
        <div style={styles.empty}>No messages yet.</div>
      ) : (
        <div style={styles.thread}>
          {messages.map((message) => {
            const isOwn = message.sender_id === user.id;
            return (
              <div key={message.id} style={{ ...styles.bubbleRow, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                <div style={{ ...styles.bubble, ...(isOwn ? styles.ownBubble : styles.otherBubble) }}>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{message.body}</div>
                  <div style={styles.time}>{new Date(message.created_at).toLocaleString()}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={sendMessage} style={styles.composer}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message..."
          style={styles.textarea}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          style={{ ...styles.sendButton, opacity: sending || !draft.trim() ? 0.6 : 1, cursor: sending ? 'wait' : 'pointer' }}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
