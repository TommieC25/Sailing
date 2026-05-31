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
  description: { color: '#334155', fontSize: '0.94rem', lineHeight: 1.42, whiteSpace: 'pre-wrap', margin: 0 },
  screenshot: { display: 'block', width: '100%', maxHeight: '320px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', marginTop: '8px' },
  thread: { display: 'grid', gap: '8px', marginBottom: '10px' },
  messageRow: { display: 'flex' },
  messageBubble: { maxWidth: '86%', borderRadius: '10px', padding: '9px 11px', border: '1px solid #e5e7eb' },
  ownBubble: { background: '#0369a1', color: '#ffffff', marginLeft: 'auto', borderColor: '#0369a1' },
  otherBubble: { background: '#ffffff', color: '#1e293b', marginRight: 'auto' },
  messageAuthor: { fontSize: '0.75rem', fontWeight: 900, margin: '0 0 4px', opacity: 0.8 },
  messageText: { fontSize: '0.93rem', lineHeight: 1.38, whiteSpace: 'pre-wrap', margin: 0 },
  composer: { display: 'grid', gap: '8px' },
  textarea: { width: '100%', minHeight: '72px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical' },
  sendButton: { padding: '9px 12px', border: 'none', borderRadius: '8px', background: '#0369a1', color: '#ffffff', fontSize: '0.95rem', fontWeight: 900, cursor: 'pointer' },
  statusSelect: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', fontSize: '0.88rem', fontWeight: 800 },
  errorBox: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', padding: '12px', borderRadius: '8px', fontWeight: 800 },
};

const statusStyle = (status) => {
  if (status === 'resolved') return { background: '#dcfce7', color: '#166534' };
  if (status === 'in_progress') return { background: '#dbeafe', color: '#1e40af' };
  return { background: '#fef3c7', color: '#92400e' };
};

export default function BugReportThreadPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const returnTo = searchParams.get('returnTo') || (isAdmin ? '/admin/inbox?tab=bugs' : '/bug-report');
  const [report, setReport] = useState(null);
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

        const { data: reportData, error: reportError } = await supabase
          .from('bug_reports')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (reportError) throw reportError;
        if (!reportData) throw new Error('Bug report not found');
        setReport(reportData);
        if (isAdmin) {
          setDraft((current) => current || 'Please tell me more... ');
        }

        const { data: submitterData } = await supabase
          .from('public_profiles')
          .select('id, full_name, photo_url, user_type')
          .eq('id', reportData.user_id)
          .maybeSingle();
        setSubmitter(submitterData || null);

        const { data: replyData, error: repliesError } = await supabase
          .from('bug_report_replies')
          .select('*')
          .eq('bug_report_id', id)
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
            .from('bug_report_replies')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadReplyIds);
          window.dispatchEvent(new Event('sailing:bug-replies-updated'));
        }
      } catch (err) {
        setError(err.message || 'Could not load bug report thread');
      } finally {
        setLoading(false);
      }
    };

    fetchThread();
  }, [id, user, isAdmin]);

  const sendReply = async (e) => {
    e.preventDefault();
    const message = draft;
    if (!message.trim() || !report) return;

    try {
      setSending(true);
      setError('');

      const { data, error: replyError } = await supabase
        .from('bug_report_replies')
        .insert({
          bug_report_id: report.id,
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
      setDraft(isAdmin ? 'Please tell me more... ' : '');

      if (isAdmin && report.status === 'open') {
        await updateStatus('in_progress');
      }

      window.dispatchEvent(new Event('sailing:bug-replies-updated'));
      window.dispatchEvent(new Event('sailing:admin-inbox-updated'));
    } catch (err) {
      setError(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (status) => {
    if (!isAdmin || !report) return;

    const { error: statusError } = await supabase
      .from('bug_reports')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', report.id);

    if (statusError) throw statusError;
    setReport((current) => ({ ...current, status }));
    window.dispatchEvent(new Event('sailing:admin-inbox-updated'));
  };

  if (loading) {
    return <div style={styles.container}>Loading bug report...</div>;
  }

  if (error || !report) {
    return <div style={styles.container}><div style={styles.errorBox}>{error || 'Bug report not found'}</div></div>;
  }

  const submitterName = submitter?.full_name || (report.user_id === user?.id ? 'You' : 'Member');
  const allMessages = [
    {
      id: `report-${report.id}`,
      sender_id: report.user_id,
      sender: submitter,
      message: report.description,
      created_at: report.created_at,
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
            <h1 style={styles.title}>{report.title}</h1>
            <p style={styles.meta}>
              From {submitterName} · {new Date(report.created_at).toLocaleString()}
            </p>
          </div>
          <span style={{ ...styles.badge, ...statusStyle(report.status) }}>{report.status}</span>
        </div>

        {isAdmin && (
          <select
            value={report.status}
            onChange={(e) => updateStatus(e.target.value).catch((err) => setError(err.message))}
            style={styles.statusSelect}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        )}

        {report.screenshot_url && (
          <a href={report.screenshot_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0369a1', fontWeight: 900, display: 'block', marginTop: '14px' }}>
            Open screenshot
            <img src={report.screenshot_url} alt="Bug report screenshot" style={styles.screenshot} />
          </a>
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
                  {message.isOriginal ? 'Original report' : authorName} · {new Date(message.created_at).toLocaleString()}
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
