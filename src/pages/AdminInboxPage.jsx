import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

const styles = {
  container: { maxWidth: '900px', margin: '0 auto' },
  backButton: { background: '#e0f2fe', border: '2px solid #0369a1', color: '#0369a1', fontWeight: 900, fontSize: '1rem', marginBottom: '10px', cursor: 'pointer', textDecoration: 'none', padding: '9px 12px', borderRadius: '8px', transition: 'all 0.2s' },
  header: { borderRadius: '10px', padding: '16px', marginBottom: '12px', background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)' },
  headerTitle: { fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', margin: '0 0 4px 0' },
  headerStats: { color: '#e0f2fe', fontSize: '0.9rem', fontWeight: 600, margin: 0 },
  errorBox: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', fontSize: '0.95rem', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontWeight: 700 },
  successBox: { background: '#f0fdf4', border: '2px solid #16a34a', color: '#166534', fontSize: '0.95rem', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontWeight: 700 },
  tabs: { display: 'flex', gap: '6px', marginBottom: '12px', borderBottom: '2px solid #e5e7eb', overflowX: 'auto' },
  tab: { padding: '8px 10px', background: 'none', border: 'none', fontSize: '0.98rem', fontWeight: 700, color: '#64748b', cursor: 'pointer', borderBottom: '3px solid transparent', transition: 'all 0.2s' },
  tabActive: { color: '#0369a1', borderBottomColor: '#0369a1' },
  items: { display: 'grid', gap: '9px' },
  item: { background: '#ffffff', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb', padding: '12px', borderLeft: '4px solid #0369a1' },
  itemNew: { background: '#f0f9ff', borderLeftColor: '#06b6d4' },
  itemOpen: { borderLeftColor: '#fbbf24' },
  itemInProgress: { borderLeftColor: '#3b82f6' },
  itemResolved: { borderLeftColor: '#16a34a', opacity: 0.7 },
  itemArchived: { borderLeftColor: '#94a3b8', opacity: 0.78 },
  itemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '7px', gap: '10px' },
  itemTitle: { fontSize: '1.05rem', fontWeight: 900, color: '#1e293b', margin: 0 },
  itemBadge: { fontSize: '0.78rem', fontWeight: 700, padding: '3px 7px', borderRadius: '6px' },
  badgeOpen: { background: '#fef3c7', color: '#92400e' },
  badgeResolved: { background: '#dcfce7', color: '#166534' },
  badgeInProgress: { background: '#dbeafe', color: '#1e40af' },
  itemMeta: { fontSize: '0.8rem', color: '#64748b', fontWeight: 600, margin: '0 0 7px' },
  itemContent: { fontSize: '0.92rem', color: '#475569', lineHeight: '1.42', margin: '0 0 10px', whiteSpace: 'pre-wrap' },
  itemUser: { fontSize: '0.88rem', color: '#334155', margin: 0, fontWeight: 700, lineHeight: 1.3 },
  submitterButton: { background: 'none', border: 'none', padding: 0, color: '#0369a1', fontSize: '0.88rem', fontWeight: 900, cursor: 'pointer', textAlign: 'left' },
  itemUserSub: { display: 'block', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 },
  statusSelect: { padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, background: '#ffffff', cursor: 'pointer' },
  actionButton: { padding: '7px 9px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a' },
  primaryButton: { borderColor: '#0369a1', background: '#0369a1', color: '#ffffff' },
  dangerButton: { borderColor: '#dc2626', background: '#dc2626', color: '#ffffff' },
  emptyBox: { background: '#ffffff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '24px 16px', textAlign: 'center' },
  emptyIcon: { fontSize: '2rem', marginBottom: '8px' },
  emptyText: { fontSize: '1rem', color: '#64748b', fontWeight: 600, margin: 0 },
  loadingSpinner: { textAlign: 'center', padding: '40px' },
  spinner: { display: 'inline-block', width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#0369a1', animation: 'spin 0.8s linear infinite' },
  restrictedBox: { background: '#fef2f2', border: '2px solid #dc2626', color: '#991b1b', padding: '20px', borderRadius: '8px', textAlign: 'center', fontSize: '1.125rem', fontWeight: 600 },
};

export default function AdminInboxPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const requestedTab = searchParams.get('tab');
  const requestedItemId = searchParams.get('id');
  const activeTab = ['messages', 'bugs', 'features'].includes(requestedTab) ? requestedTab : 'messages';
  const [messages, setMessages] = useState([]);
  const [bugReports, setBugReports] = useState([]);
  const [featureRequests, setFeatureRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [inboxError, setInboxError] = useState('');
  const isAdmin = profile?.role === 'admin';

  const attachSubmitters = async (items) => {
    const userIds = [...new Set(items.map((item) => item.user_id).filter(Boolean))];
    if (userIds.length === 0) return items;

    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, user_type')
      .in('id', userIds);

    if (error) throw error;

    const usersById = Object.fromEntries((data || []).map((submitter) => [submitter.id, submitter]));
    return items.map((item) => ({
      ...item,
      submitter: usersById[item.user_id] || null,
    }));
  };

  useEffect(() => {
    if (!requestedItemId || loading) return;

    document.getElementById(`inbox-item-${requestedItemId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [requestedItemId, loading, activeTab, messages, bugReports, featureRequests]);

  useEffect(() => {
    if (!user || !isAdmin) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [messagesRes, bugsRes, featuresRes] = await Promise.all([
          supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
          supabase.from('bug_reports').select('*').order('created_at', { ascending: false }),
          supabase.from('feature_requests').select('*').order('created_at', { ascending: false }),
        ]);

        const [messagesWithUsers, bugsWithUsers, featuresWithUsers] = await Promise.all([
          attachSubmitters(messagesRes.data || []),
          attachSubmitters(bugsRes.data || []),
          attachSubmitters(featuresRes.data || []),
        ]);

        const bugIds = bugsWithUsers.map((bug) => bug.id);
        let bugReplies = [];
        if (bugIds.length > 0) {
          const { data, error: repliesError } = await supabase
            .from('bug_report_replies')
            .select('*')
            .in('bug_report_id', bugIds)
            .order('created_at', { ascending: true });

          if (repliesError) {
            console.error('Error fetching bug report replies:', repliesError);
          } else {
            bugReplies = data || [];
          }
        }

        const replySenderIds = [...new Set((bugReplies || []).map((reply) => reply.sender_id).filter(Boolean))];
        const { data: replySenders, error: replySendersError } = replySenderIds.length
          ? await supabase
              .from('users')
              .select('id, full_name, email, user_type')
              .in('id', replySenderIds)
          : { data: [], error: null };

        if (replySendersError) throw replySendersError;

        const sendersById = Object.fromEntries((replySenders || []).map((sender) => [sender.id, sender]));
        const repliesByBugId = (bugReplies || []).reduce((byBug, reply) => {
          byBug[reply.bug_report_id] = byBug[reply.bug_report_id] || [];
          byBug[reply.bug_report_id].push({
            ...reply,
            sender: sendersById[reply.sender_id] || null,
          });
          return byBug;
        }, {});

        const unreadReplyIds = (bugReplies || [])
          .filter((reply) => reply.sender_id !== user.id && !reply.read_at)
          .map((reply) => reply.id);

        if (unreadReplyIds.length > 0) {
          await supabase
            .from('bug_report_replies')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadReplyIds);
          window.dispatchEvent(new Event('sailing:bug-replies-updated'));
        }

        setMessages(messagesWithUsers.filter((message) => message.status !== 'archived'));
        setBugReports(bugsWithUsers.map((bug) => ({
          ...bug,
          replies: repliesByBugId[bug.id] || [],
        })));
        setFeatureRequests(featuresWithUsers);
      } catch (err) {
        console.error('Error fetching inbox:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isAdmin]);

  const updateStatus = async (table, id, status) => {
    try {
      setUpdating(id);
      setInboxError('');
      const { error } = await supabase
        .from(table)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      if (table === 'contact_messages') {
        setMessages((current) => current.map((m) => (m.id === id ? { ...m, status } : m)));
      } else if (table === 'bug_reports') {
        setBugReports((current) => current.map((b) => (b.id === id ? { ...b, status } : b)));
      } else if (table === 'feature_requests') {
        setFeatureRequests((current) => current.map((f) => (f.id === id ? { ...f, status } : f)));
      }
      window.dispatchEvent(new Event('sailing:admin-inbox-updated'));
    } catch (err) {
      console.error('Error updating status:', err);
      setInboxError(err.message || 'Could not update status');
    } finally {
      setUpdating(null);
    }
  };

  const archiveMessage = async (id) => {
    try {
      setUpdating(id);
      setInboxError('');
      const { error } = await supabase
        .from('contact_messages')
        .update({ status: 'archived' })
        .eq('id', id);

      if (error) throw error;
      setMessages((current) => current.filter((message) => message.id !== id));
      window.dispatchEvent(new Event('sailing:admin-inbox-updated'));
    } catch (err) {
      console.error('Error archiving message:', err);
      setInboxError(err.message || 'Could not archive message');
    } finally {
      setUpdating(null);
    }
  };

  const deleteMessage = async (id) => {
    if (!window.confirm('Delete this message? This cannot be undone.')) return;

    try {
      setUpdating(id);
      setInboxError('');
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessages((current) => current.filter((message) => message.id !== id));
      window.dispatchEvent(new Event('sailing:admin-inbox-updated'));
    } catch (err) {
      console.error('Error deleting message:', err);
      setInboxError(err.message || 'Could not delete message');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingSpinner}>
          <div style={styles.spinner} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <button
          onClick={() => navigate('/')}
          style={styles.backButton}
          onMouseEnter={(e) => e.target.style.background = '#bfdbfe'}
          onMouseLeave={(e) => e.target.style.background = '#e0f2fe'}
        >
          ← Back
        </button>
        <div style={styles.restrictedBox}>
          🔒 This page is restricted to administrators only.
        </div>
      </div>
    );
  }

  const statusLabel = (status) => {
    const labels = {
      open: 'Open',
      pending: 'Pending',
      in_progress: 'In Progress',
      in_development: 'In Development',
      resolved: 'Resolved',
      implemented: 'Implemented',
    };
    return labels[status] || status?.replace(/_/g, ' ') || 'Pending';
  };

  const statusBadgeStyle = (status) => ({
    ...styles.itemBadge,
    ...(status === 'open' || status === 'pending'
      ? styles.badgeOpen
      : status === 'resolved' || status === 'implemented'
        ? styles.badgeResolved
        : styles.badgeInProgress),
  });

  const featureStatusValue = (status) => {
    if (status === 'open') return 'pending';
    if (status === 'in_progress') return 'in_development';
    if (status === 'resolved') return 'implemented';
    return status || 'pending';
  };

  const itemStatusStyle = (status) => (
    status === 'open' || status === 'pending'
      ? styles.itemOpen
      : status === 'resolved' || status === 'implemented'
        ? styles.itemResolved
        : status === 'archived'
          ? styles.itemArchived
          : styles.itemInProgress
  );

  const renderSubmitter = (item) => {
    const submitterName = item.submitter?.full_name || 'Unknown member';
    const submitterDetail = [item.submitter?.email, item.submitter?.user_type].filter(Boolean).join(' • ');

    return (
      <div style={styles.itemUser}>
        From: {item.user_id ? (
          <button
            type="button"
            onClick={() => navigate(`/profile/${item.user_id}?returnTo=${encodeURIComponent(`/admin/inbox?tab=${activeTab}`)}`)}
            style={styles.submitterButton}
          >
            {submitterName}
          </button>
        ) : (
          submitterName
        )}
        <span style={styles.itemUserSub}>{submitterDetail || `User ID: ${item.user_id}`}</span>
      </div>
    );
  };

  const renderMessage = (item) => {
    const isLinkedItem = requestedItemId === item.id;

    return (
      <div
        key={item.id}
        id={`inbox-item-${item.id}`}
        style={{
          ...styles.item,
          ...(isLinkedItem ? { boxShadow: '0 0 0 3px #0284c7, 0 8px 20px rgba(2,132,199,0.18)' } : {}),
        }}
      >
        <div style={styles.itemHeader}>
          <h3 style={styles.itemTitle}>📧 {item.subject}</h3>
        </div>
        <p style={styles.itemMeta}>
          {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString()}
        </p>
        <p style={styles.itemContent}>{item.message}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {renderSubmitter(item)}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate(`/messages/${item.user_id}`)}
              disabled={!item.user_id || updating === item.id}
              style={{ ...styles.actionButton, ...styles.primaryButton, opacity: !item.user_id || updating === item.id ? 0.6 : 1 }}
            >
              Reply
            </button>
            <button
              type="button"
              onClick={() => archiveMessage(item.id)}
              disabled={updating === item.id}
              style={{ ...styles.actionButton, opacity: updating === item.id ? 0.6 : 1 }}
            >
              Archive
            </button>
            <button
              type="button"
              onClick={() => deleteMessage(item.id)}
              disabled={updating === item.id}
              style={{ ...styles.actionButton, ...styles.dangerButton, opacity: updating === item.id ? 0.6 : 1 }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderBugReport = (item) => {
    const isLinkedItem = requestedItemId === item.id;

    return (
      <div
        key={item.id}
        id={`inbox-item-${item.id}`}
        style={{
          ...styles.item,
          ...itemStatusStyle(item.status),
          ...(isLinkedItem ? { boxShadow: '0 0 0 3px #0284c7, 0 8px 20px rgba(2,132,199,0.18)' } : {}),
        }}
      >
        <div style={styles.itemHeader}>
          <button
            type="button"
            onClick={() => navigate(`/bug-report/${item.id}?returnTo=${encodeURIComponent('/admin/inbox?tab=bugs')}`)}
            style={{ ...styles.itemTitle, color: '#0369a1', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
          >
            🐛 {item.title}
          </button>
          <span style={statusBadgeStyle(item.status)}>{statusLabel(item.status)}</span>
        </div>
        <p style={styles.itemMeta}>
          {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString()}
        </p>
        <p style={styles.itemContent}>{item.description}</p>
        {item.screenshot_url && (
          <p style={{ fontSize: '0.875rem', marginBottom: '12px' }}>
            <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0369a1', fontWeight: 600 }}>
              📷 View Screenshot
            </a>
          </p>
        )}
        <button
          type="button"
          onClick={() => navigate(`/bug-report/${item.id}?returnTo=${encodeURIComponent('/admin/inbox?tab=bugs')}`)}
          style={{ width: '100%', padding: '9px 12px', border: 'none', borderRadius: '8px', background: '#0369a1', color: '#ffffff', fontSize: '0.92rem', fontWeight: 900, cursor: 'pointer', marginBottom: '10px' }}
        >
          Open full conversation
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {renderSubmitter(item)}
          <select
            value={item.status}
            onChange={(e) => updateStatus('bug_reports', item.id, e.target.value)}
            disabled={updating === item.id}
            style={styles.statusSelect}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>
    );
  };

  const renderFeatureRequest = (item) => {
    const isLinkedItem = requestedItemId === item.id;
    const featureStatus = featureStatusValue(item.status);

    return (
      <div
        key={item.id}
        id={`inbox-item-${item.id}`}
        style={{
          ...styles.item,
          ...itemStatusStyle(featureStatus),
          ...(isLinkedItem ? { boxShadow: '0 0 0 3px #0284c7, 0 8px 20px rgba(2,132,199,0.18)' } : {}),
        }}
      >
        <div style={styles.itemHeader}>
          <h3 style={styles.itemTitle}>⭐ {item.title}</h3>
          <span style={statusBadgeStyle(featureStatus)}>{statusLabel(featureStatus)}</span>
        </div>
        <p style={styles.itemMeta}>
          {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString()}
        </p>
        <p style={styles.itemContent}>{item.description}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {renderSubmitter(item)}
          <select
            value={featureStatus}
            onChange={(e) => updateStatus('feature_requests', item.id, e.target.value)}
            disabled={updating === item.id}
            style={styles.statusSelect}
          >
            <option value="pending">Pending</option>
            <option value="in_development">In Development</option>
            <option value="implemented">Implemented</option>
          </select>
        </div>
      </div>
    );
  };

  const tabs = [
    { key: 'messages', label: '📧 Messages', count: messages.length },
    { key: 'bugs', label: '🐛 Bug Reports', count: bugReports.length },
    { key: 'features', label: '⭐ Feature Requests', count: featureRequests.length },
  ];

  const currentData = {
    messages: messages,
    bugs: bugReports,
    features: featureRequests,
  };

  const currentItems = currentData[activeTab];

  return (
    <div style={styles.container}>
      <button
        onClick={() => navigate('/')}
        style={styles.backButton}
        onMouseEnter={(e) => e.target.style.background = '#bfdbfe'}
        onMouseLeave={(e) => e.target.style.background = '#e0f2fe'}
      >
        ← Back
      </button>

      <div style={styles.header}>
        <h1 style={styles.headerTitle}>📬 Admin Inbox</h1>
        <p style={styles.headerStats}>
          {messages.length} messages • {bugReports.length} bug reports • {featureRequests.length} feature requests
        </p>
      </div>

      {inboxError && <div style={styles.errorBox}>{inboxError}</div>}

      <div style={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setSearchParams({ tab: tab.key });
            }}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key ? styles.tabActive : {}),
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {currentItems.length === 0 ? (
        <div style={styles.emptyBox}>
          <div style={styles.emptyIcon}>✨</div>
          <p style={styles.emptyText}>
            {activeTab === 'messages' && 'No messages yet'}
            {activeTab === 'bugs' && 'No bug reports yet'}
            {activeTab === 'features' && 'No feature requests yet'}
          </p>
        </div>
      ) : (
        <div style={styles.items}>
          {activeTab === 'messages' && messages.map(renderMessage)}
          {activeTab === 'bugs' && bugReports.map(renderBugReport)}
          {activeTab === 'features' && featureRequests.map(renderFeatureRequest)}
        </div>
      )}
    </div>
  );
}
