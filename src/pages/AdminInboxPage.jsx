import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

const styles = {
  container: { maxWidth: '900px', margin: '0 auto' },
  backButton: { background: '#e0f2fe', border: '2px solid #0369a1', color: '#0369a1', fontWeight: 900, fontSize: '1.125rem', marginBottom: '16px', cursor: 'pointer', textDecoration: 'none', padding: '12px 16px', borderRadius: '8px', transition: 'all 0.2s' },
  header: { borderRadius: '12px', padding: '24px', marginBottom: '24px', background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)' },
  headerTitle: { fontSize: '1.875rem', fontWeight: 900, color: '#ffffff', margin: '0 0 8px 0' },
  headerStats: { color: '#e0f2fe', fontSize: '1rem', fontWeight: 600, margin: 0 },
  errorBox: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', fontSize: '1rem', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontWeight: 700 },
  successBox: { background: '#f0fdf4', border: '2px solid #16a34a', color: '#166534', fontSize: '1rem', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontWeight: 700 },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', overflowX: 'auto' },
  tab: { padding: '12px 16px', background: 'none', border: 'none', fontSize: '1.125rem', fontWeight: 700, color: '#64748b', cursor: 'pointer', borderBottom: '3px solid transparent', transition: 'all 0.2s' },
  tabActive: { color: '#0369a1', borderBottomColor: '#0369a1' },
  items: { display: 'grid', gap: '16px' },
  item: { background: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '20px', borderLeft: '4px solid #0369a1' },
  itemNew: { background: '#f0f9ff', borderLeftColor: '#06b6d4' },
  itemOpen: { borderLeftColor: '#fbbf24' },
  itemResolved: { borderLeftColor: '#16a34a', opacity: 0.7 },
  itemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' },
  itemTitle: { fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', margin: 0 },
  itemBadge: { fontSize: '0.875rem', fontWeight: 700, padding: '4px 8px', borderRadius: '6px' },
  badgeOpen: { background: '#fef3c7', color: '#92400e' },
  badgeResolved: { background: '#dcfce7', color: '#166534' },
  badgeInProgress: { background: '#dbeafe', color: '#1e40af' },
  itemMeta: { fontSize: '0.875rem', color: '#64748b', fontWeight: 600, marginBottom: '12px' },
  itemContent: { fontSize: '1rem', color: '#475569', lineHeight: '1.6', marginBottom: '16px', whiteSpace: 'pre-wrap' },
  itemUser: { fontSize: '0.95rem', color: '#334155', margin: 0, fontWeight: 700, lineHeight: 1.4 },
  itemUserSub: { display: 'block', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 },
  statusSelect: { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, background: '#ffffff', cursor: 'pointer' },
  emptyBox: { background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '48px 24px', textAlign: 'center' },
  emptyIcon: { fontSize: '3rem', marginBottom: '16px' },
  emptyText: { fontSize: '1.125rem', color: '#64748b', fontWeight: 600, margin: 0 },
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

        setMessages(messagesWithUsers);
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

  const renderItem = (item, table, icon) => {
    const isMessage = table === 'contact_messages';
    const isBug = table === 'bug_reports';
    const isLinkedItem = requestedItemId === item.id;
    const submitterName = item.submitter?.full_name || 'Unknown member';
    const submitterDetail = [item.submitter?.email, item.submitter?.user_type].filter(Boolean).join(' • ');

    return (
      <div
        key={item.id}
        id={`inbox-item-${item.id}`}
        style={{
          ...styles.item,
          ...(item.status === 'open' ? styles.itemOpen : item.status === 'resolved' ? styles.itemResolved : styles.itemInProgress),
          ...(isLinkedItem ? { boxShadow: '0 0 0 3px #0284c7, 0 8px 20px rgba(2,132,199,0.18)' } : {}),
        }}
      >
        <div style={styles.itemHeader}>
          {isBug ? (
            <button
              type="button"
              onClick={() => navigate(`/bug-report/${item.id}?returnTo=${encodeURIComponent('/admin/inbox?tab=bugs')}`)}
              style={{ ...styles.itemTitle, color: '#0369a1', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
            >
              {icon} {item.title}
            </button>
          ) : (
            <h3 style={styles.itemTitle}>
              {icon} {isMessage ? item.subject : item.title}
            </h3>
          )}
          <span
            style={{
              ...styles.itemBadge,
              ...(item.status === 'open'
                ? styles.badgeOpen
                : item.status === 'resolved'
                ? styles.badgeResolved
                : styles.badgeInProgress),
            }}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </span>
        </div>
        <p style={styles.itemMeta}>
          {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString()}
        </p>
        <p style={styles.itemContent}>{isMessage ? item.message : isBug ? item.description : item.description}</p>
        {isBug && item.screenshot_url && (
          <p style={{ fontSize: '0.875rem', marginBottom: '12px' }}>
            <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0369a1', fontWeight: 600 }}>
              📷 View Screenshot
            </a>
          </p>
        )}
        {isBug && (
          <button
            type="button"
            onClick={() => navigate(`/bug-report/${item.id}?returnTo=${encodeURIComponent('/admin/inbox?tab=bugs')}`)}
            style={{ width: '100%', padding: '12px 14px', border: 'none', borderRadius: '8px', background: '#0369a1', color: '#ffffff', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', marginBottom: '14px' }}
          >
            Open full conversation
          </button>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <p style={styles.itemUser}>
            From: {submitterName}
            <span style={styles.itemUserSub}>{submitterDetail || `User ID: ${item.user_id}`}</span>
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {item.status !== 'resolved' && (
              <button
                type="button"
                onClick={() => updateStatus(table, item.id, 'resolved')}
                disabled={updating === item.id}
                style={{ padding: '8px 12px', border: '1px solid #16a34a', borderRadius: '6px', background: '#16a34a', color: '#ffffff', fontSize: '0.875rem', fontWeight: 900, cursor: updating === item.id ? 'wait' : 'pointer', opacity: updating === item.id ? 0.6 : 1 }}
              >
                Dismiss as resolved
              </button>
            )}
            <select
              value={item.status}
              onChange={(e) => updateStatus(table, item.id, e.target.value)}
              disabled={updating === item.id}
              style={styles.statusSelect}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
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
          {activeTab === 'messages' && messages.map((msg) => renderItem(msg, 'contact_messages', '📧', 'message'))}
          {activeTab === 'bugs' && bugReports.map((bug) => renderItem(bug, 'bug_reports', '🐛', 'bug'))}
          {activeTab === 'features' && featureRequests.map((feature) => renderItem(feature, 'feature_requests', '⭐', 'feature'))}
        </div>
      )}
    </div>
  );
}
