import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

const styles = {
  container: { maxWidth: '760px', margin: '0 auto' },
  backButton: { background: '#e0f2fe', border: '2px solid #0369a1', color: '#0369a1', fontWeight: 900, fontSize: '0.95rem', marginBottom: '10px', cursor: 'pointer', padding: '9px 12px', borderRadius: '8px' },
  card: { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', padding: '12px', marginBottom: '10px' },
  title: { color: '#0f172a', fontSize: '1.25rem', fontWeight: 900, margin: '0 0 4px' },
  meta: { color: '#64748b', fontSize: '0.84rem', fontWeight: 700, margin: '0 0 7px' },
  badge: { display: 'inline-block', borderRadius: '999px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 900, textTransform: 'capitalize' },
  thread: { display: 'grid', gap: '8px', marginBottom: '10px' },
  messageRow: { display: 'flex' },
  messageBubble: { maxWidth: '86%', borderRadius: '10px', padding: '9px 11px', border: '1px solid #e5e7eb' },
  ownBubble: { background: '#0369a1', color: '#ffffff', marginLeft: 'auto', borderColor: '#0369a1' },
  otherBubble: { background: '#ffffff', color: '#1e293b', marginRight: 'auto' },
  messageAuthor: { fontSize: '0.75rem', fontWeight: 900, margin: '0 0 4px', opacity: 0.8 },
  authorButton: { background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', fontWeight: 900, cursor: 'pointer', textAlign: 'left', textDecoration: 'underline' },
  messageText: { fontSize: '0.93rem', lineHeight: 1.38, whiteSpace: 'pre-wrap', margin: 0 },
  composer: { display: 'grid', gap: '8px' },
  textarea: { width: '100%', minHeight: '72px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical' },
  sendButton: { padding: '9px 12px', border: 'none', borderRadius: '8px', background: '#0369a1', color: '#ffffff', fontSize: '0.95rem', fontWeight: 900, cursor: 'pointer' },
  statusSelect: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', fontSize: '0.88rem', fontWeight: 800 },
  errorBox: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', padding: '12px', borderRadius: '8px', fontWeight: 800 },
};

const statusLabel = (status) => {
  const labels = {
    pending: 'Pending',
    in_development: 'In Development',
    implemented: 'Implemented',
  };
  return labels[status] || 'Pending';
};

const statusStyle = (status) => {
  if (status === 'implemented') return { background: '#dcfce7', color: '#166534' };
  if (status === 'in_development') return { background: '#dbeafe', color: '#1e40af' };
  return { background: '#fef3c7', color: '#92400e' };
};

const statusMessage = (status, title) => {
  if (status === 'in_development') {
    return `Your feature request "${title}" is now in development. We'll follow up here as progress continues.`;
  }
  if (status === 'implemented') {
    return `Your feature request "${title}" has been implemented. Thank you for helping improve the app.`;
  }
  return null;
};

export default function FeatureRequestThreadPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const returnTo = searchParams.get('returnTo') || (isAdmin ? '/admin/inbox?tab=features' : '/feature-request');
  const [request, setRequest] = useState(null);
  const [submitter, setSubmitter] = useState(null);
  const [replies, setReplies] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchThread = async () => {
      try {
        setLoading(true);
        setError('');

        const { data: requestData, error: requestError } = await supabase
          .from('feature_requests')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (requestError) throw requestError;
        if (!requestData) throw new Error('Feature request not found');
        setRequest(requestData);

        const { data: submitterData } = await supabase
          .from('public_profiles')
          .select('id, full_name, photo_url, user_type')
          .eq('id', requestData.user_id)
          .maybeSingle();
        setSubmitter(submitterData || null);

        const { data: replyData, error: repliesError } = await supabase
          .from('feature_request_replies')
          .select('*')
          .eq('feature_request_id', id)
          .order('created_at', { ascending: true });

        if (repliesError) throw repliesError;

        const senderIds = [...new Set((replyData || []).map((reply) => reply.sender_id).filter(Boolean))];
        const { data: senders, error: sendersError } = senderIds.length
          ? await supabase
              .from('public_profiles')
              .select('id, full_name, photo_url, user_type')
              .in('id', senderIds)
          : { data: [], error: null };

        if (sendersError) throw sendersError;

        const sendersById = Object.fromEntries((senders || []).map((sender) => [sender.id, sender]));
        setReplies((replyData || []).map((reply) => ({
          ...reply,
          sender: sendersById[reply.sender_id] || null,
        })));

        const unreadReplyIds = (replyData || [])
          .filter((reply) => reply.sender_id !== user.id && !reply.read_at)
          .map((reply) => reply.id);

        if (unreadReplyIds.length > 0) {
          await supabase
            .from('feature_request_replies')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadReplyIds);
          window.dispatchEvent(new Event('sailing:feature-replies-updated'));
        }
      } catch (err) {
        setError(err.message || 'Could not load feature request thread');
      } finally {
        setLoading(false);
      }
    };

    fetchThread();
  }, [id, user]);

  const addReply = async (message) => {
    const { data, error: replyError } = await supabase
      .from('feature_request_replies')
      .insert({
        feature_request_id: request.id,
        sender_id: user.id,
        message,
      })
      .select()
      .single();

    if (replyError) throw replyError;
    setReplies((current) => [
      ...current,
      { ...data, sender: { id: user.id, full_name: profile?.full_name || 'You' } },
    ]);
    window.dispatchEvent(new Event('sailing:feature-replies-updated'));
  };

  const sendReply = async (e) => {
    e.preventDefault();
    const message = draft;
    if (!message.trim() || !request) return;

    try {
      setSending(true);
      setError('');
      await addReply(message);
      setDraft('');
    } catch (err) {
      setError(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (status) => {
    if (!isAdmin || !request || status === request.status) return;

    const previousStatus = request.status;
    const { error: statusError } = await supabase
      .from('feature_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', request.id);

    if (statusError) throw statusError;
    setRequest((current) => ({ ...current, status }));

    const automaticMessage = statusMessage(status, request.title);
    if (automaticMessage && previousStatus !== status) {
      await addReply(automaticMessage);
    }

    window.dispatchEvent(new Event('sailing:admin-inbox-updated'));
  };

  if (loading) {
    return <div style={styles.container}>Loading feature request...</div>;
  }

  if (error || !request) {
    return <div style={styles.container}><div style={styles.errorBox}>{error || 'Feature request not found'}</div></div>;
  }

  const submitterName = submitter?.full_name || (request.user_id === user?.id ? 'You' : 'Member');
  const allMessages = [
    {
      id: `request-${request.id}`,
      sender_id: request.user_id,
      sender: submitter,
      message: request.description,
      created_at: request.created_at,
      isOriginal: true,
    },
    ...replies,
  ];

  return (
    <div style={styles.container}>
      <button type="button" onClick={() => navigate(returnTo)} style={styles.backButton}>
        Back
      </button>

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <h1 style={styles.title}>{request.title}</h1>
            <p style={styles.meta}>
              From {request.user_id ? (
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${request.user_id}?returnTo=${encodeURIComponent(`/feature-request/${request.id}`)}`)}
                  style={{ ...styles.authorButton, color: '#0369a1' }}
                >
                  {submitterName}
                </button>
              ) : (
                submitterName
              )} · {new Date(request.created_at).toLocaleString()}
            </p>
          </div>
          <span style={{ ...styles.badge, ...statusStyle(request.status) }}>{statusLabel(request.status)}</span>
        </div>

        {isAdmin && (
          <select
            value={request.status || 'pending'}
            onChange={(e) => updateStatus(e.target.value).catch((err) => setError(err.message))}
            style={styles.statusSelect}
          >
            <option value="pending">Pending</option>
            <option value="in_development">In Development</option>
            <option value="implemented">Implemented</option>
          </select>
        )}
      </div>

      {error && <div style={{ ...styles.errorBox, marginBottom: '16px' }}>{error}</div>}

      <div style={styles.thread}>
        {allMessages.map((message) => {
          const isOwn = message.sender_id === user?.id;
          const authorName = message.sender?.full_name || (isOwn ? 'You' : 'Member');
          return (
            <div key={message.id} style={{ ...styles.messageRow, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
              <div style={{ ...styles.messageBubble, ...(isOwn ? styles.ownBubble : styles.otherBubble) }}>
                <p style={styles.messageAuthor}>
                  {message.isOriginal ? 'Original request' : (
                    message.sender_id ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/profile/${message.sender_id}?returnTo=${encodeURIComponent(`/feature-request/${request.id}`)}`)}
                        style={styles.authorButton}
                      >
                        {authorName}
                      </button>
                    ) : authorName
                  )} · {new Date(message.created_at).toLocaleString()}
                </p>
                <p style={styles.messageText}>{message.message}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={sendReply} style={{ ...styles.card, ...styles.composer }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Reply in the app..."
          style={styles.textarea}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          style={{ ...styles.sendButton, opacity: sending || !draft.trim() ? 0.6 : 1, cursor: sending ? 'wait' : 'pointer' }}
        >
          {sending ? 'Sending...' : 'Send reply'}
        </button>
      </form>
    </div>
  );
}
