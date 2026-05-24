import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [inboxFilter, setInboxFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const admins = users.filter((u) => u.role === 'admin');
  const [bugReports, setBugReports] = useState([]);
  const [featureRequests, setFeatureRequests] = useState([]);
  const [contactMessages, setContactMessages] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementMessage, setNewAnnouncementMessage] = useState('');

  async function attachSubmitters(items) {
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
  }

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError(null);

      // Load stats
      const [usersRes, boatsRes, outingsRes, crewReqRes, bugsRes, featuresRes, msgsRes, announcementRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('boats').select('id', { count: 'exact', head: true }),
        supabase.from('outings').select('id', { count: 'exact', head: true }),
        supabase.from('crew_requests').select('id', { count: 'exact', head: true }),
        supabase.from('bug_reports').select('id', { count: 'exact', head: true }),
        supabase.from('feature_requests').select('id', { count: 'exact', head: true }),
        supabase.from('contact_messages').select('id', { count: 'exact', head: true }),
        supabase.from('announcements').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalBoats: boatsRes.count || 0,
        totalOutings: outingsRes.count || 0,
        totalCrewRequests: crewReqRes.count || 0,
        openBugReports: bugsRes.count || 0,
        openFeatureRequests: featuresRes.count || 0,
        openMessages: msgsRes.count || 0,
        totalAnnouncements: announcementRes.count || 0,
      });

      // Load detailed data
      const [usersData, bugsData, featuresData, msgsData, announcementsData] = await Promise.all([
        supabase.from('users').select('*').limit(100),
        supabase.from('bug_reports').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('feature_requests').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(20),
      ]);

      setUsers(usersData.data || []);
      const [bugsWithSubmitters, featuresWithSubmitters, messagesWithSubmitters] = await Promise.all([
        attachSubmitters(bugsData.data || []),
        attachSubmitters(featuresData.data || []),
        attachSubmitters(msgsData.data || []),
      ]);

      setBugReports(bugsWithSubmitters);
      setFeatureRequests(featuresWithSubmitters);
      setContactMessages(messagesWithSubmitters);
      setAnnouncements(announcementsData.data || []);

      // Load recent activity
      const activityData = await loadRecentActivity();
      setRecentActivity(activityData);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecentActivity() {
    try {
      const [outingsData, crewData, chatData] = await Promise.all([
        supabase.from('outings').select('id, title, skipper_id, created_at, users(full_name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('crew_requests').select('id, status, created_at, outing_id, outings(title), users(full_name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('general_chat').select('message, created_at, users(full_name)').order('created_at', { ascending: false }).limit(10),
      ]);

      return [
        ...(outingsData.data || []).map(o => ({ type: 'outing', id: o.id, title: o.title, user: o.users?.full_name, time: o.created_at })),
        ...(crewData.data || []).map(c => ({ type: 'crew_request', id: c.outing_id, title: `${c.status} crew request for ${c.outings?.title}`, user: c.users?.full_name, time: c.created_at })),
        ...(chatData.data || []).map(c => ({ type: 'chat', title: c.message?.substring(0, 50), user: c.users?.full_name, time: c.created_at })),
      ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 20);
    } catch (err) {
      console.error('Error loading activity:', err);
      return [];
    }
  }

  useEffect(() => {
    // Load the dashboard once when the admin page opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncementTitle.trim() || !newAnnouncementMessage.trim()) return;

    try {
      const { error } = await supabase.from('announcements').insert([
        {
          admin_id: user.id,
          title: newAnnouncementTitle,
          message: newAnnouncementMessage,
        },
      ]);

      if (error) throw error;

      setNewAnnouncementTitle('');
      setNewAnnouncementMessage('');
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateBugReport = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('bug_reports')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateFeatureRequest = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('feature_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateMessage = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMakeAdmin = async (userId) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', userId);

      if (error) throw error;
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveAdmin = async (userId) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'user' })
        .eq('id', userId);

      if (error) throw error;
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    }
  };

  const tabStyle = {
    padding: '12px 16px',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    color: '#0f172a',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  };

  const activeTabStyle = {
    ...tabStyle,
    background: '#0369a1',
    borderColor: '#0369a1',
    color: '#ffffff',
  };

  const submitterText = (item) => {
    const name = item.submitter?.full_name || 'Unknown member';
    const detail = [item.submitter?.email, item.submitter?.user_type].filter(Boolean).join(' • ');
    return detail ? `${name} (${detail})` : `${name} (${item.user_id})`;
  };

  const goToTab = (tab, options = {}) => {
    setActiveTab(tab);
    if (options.inboxFilter) setInboxFilter(options.inboxFilter);
    setSelectedFeedback(options.selectedFeedback || null);
  };

  const openFeedback = (type, item) => {
    setInboxFilter(type);
    setSelectedFeedback({ type, item });
  };

  const feedbackConfig = {
    bugs: {
      title: 'Bug Reports',
      icon: '🐛',
      items: bugReports,
      accent: '#ef4444',
      statusHandler: handleUpdateBugReport,
      tableLabel: 'bug report',
    },
    features: {
      title: 'Feature Requests',
      icon: '⭐',
      items: featureRequests,
      accent: '#3b82f6',
      statusHandler: handleUpdateFeatureRequest,
      tableLabel: 'feature request',
    },
    messages: {
      title: 'Contact Messages',
      icon: '💬',
      items: contactMessages,
      accent: '#10b981',
      statusHandler: handleUpdateMessage,
      tableLabel: 'contact message',
    },
  };

  const feedbackTitle = (type, item) => (type === 'messages' ? item.subject : item.title);
  const feedbackBody = (type, item) => (type === 'messages' ? item.message : item.description);

  const openActivity = (activity) => {
    if (activity.type === 'outing' || activity.type === 'crew_request') {
      navigate(`/outing/${activity.id}`);
      return;
    }

    goToTab('activity');
  };

  const renderFeedbackSection = (type) => {
    const config = feedbackConfig[type];
    const openItems = config.items.filter((item) => item.status === 'open').length;

    return (
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '16px' }}>
          {config.icon} {config.title} ({openItems} open / {config.items.length} total)
        </h3>
        {config.items.length === 0 ? (
          <div style={{ background: '#ffffff', padding: '18px', borderRadius: '10px', border: '1px solid #e5e7eb', color: '#64748b', fontWeight: 700 }}>
            No {config.tableLabel}s yet.
          </div>
        ) : (
          config.items.map((item) => {
            const isSelected = selectedFeedback?.type === type && selectedFeedback?.item?.id === item.id;
            return (
              <div key={item.id} style={{ background: '#ffffff', padding: '16px', marginBottom: '12px', borderRadius: '8px', borderLeft: `4px solid ${config.accent}`, boxShadow: isSelected ? '0 0 0 3px #bfdbfe' : '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => openFeedback(type, item)}
                    style={{ minWidth: 0, flex: '1 1 240px', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    <h4 style={{ margin: 0, fontWeight: 900, color: '#0369a1', fontSize: '1.05rem' }}>{feedbackTitle(type, item)}</h4>
                    <p style={{ margin: '6px 0', fontSize: '0.95rem', color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {isSelected ? feedbackBody(type, item) : `${feedbackBody(type, item)?.substring(0, 180) || ''}${feedbackBody(type, item)?.length > 180 ? '...' : ''}`}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#334155', fontWeight: 700 }}>From: {submitterText(item)}</p>
                    <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#64748b' }}>Submitted {new Date(item.created_at).toLocaleString()}</p>
                  </button>
                  <div style={{ display: 'grid', gap: '8px', minWidth: '150px' }}>
                    <select
                      value={item.status}
                      onChange={(e) => config.statusHandler(item.id, e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontWeight: 700, background: '#ffffff' }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      {type === 'features' && <option value="planned">Planned</option>}
                      {type === 'features' && <option value="completed">Completed</option>}
                      <option value="resolved">Resolved</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => openFeedback(type, item)}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', background: '#0369a1', color: '#ffffff', fontWeight: 900, cursor: 'pointer' }}
                    >
                      {isSelected ? 'Open' : 'View'}
                    </button>
                  </div>
                </div>
                {isSelected && (
                  <div style={{ marginTop: '12px', padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 8px', color: '#0f172a', fontWeight: 900 }}>Full {config.tableLabel}</p>
                    <p style={{ margin: 0, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{feedbackBody(type, item)}</p>
                    {type === 'bugs' && item.screenshot_url && (
                      <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '12px', color: '#0369a1', fontWeight: 900 }}>
                        View screenshot
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '1.5rem' }}>📊 Loading Admin Dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)', padding: '24px', color: '#ffffff' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900 }}>⚙️ Admin Dashboard</h1>
        <p style={{ margin: '8px 0 0', fontSize: '1rem', color: '#a5f3fc' }}>Community Management & Monitoring</p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '16px', margin: '16px', borderRadius: '8px', fontWeight: 700 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ background: '#ffffff', borderBottom: '2px solid #e5e7eb', padding: '12px 16px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '8px', minWidth: 'max-content' }}>
        {['overview', 'community', 'inbox', 'announcements', 'activity', 'admins', 'moderation', 'reports'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={activeTab === tab ? activeTabStyle : tabStyle}
          >
            {{
              overview: '📊 Overview',
              community: '👥 Community',
              inbox: '📬 Inbox',
              announcements: '📢 Announcements',
              activity: '📈 Activity',
              admins: '🔐 Admins',
              moderation: '🚫 Moderation',
              reports: '📋 Reports',
            }[tab]}
          </button>
        ))}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '24px' }}>System Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              {[
                { label: 'Total Users', value: stats?.totalUsers, icon: '👥', tab: 'community', helper: 'Open user list' },
                { label: 'Total Boats', value: stats?.totalBoats, icon: '⛵', tab: 'community', helper: 'Open owners/users' },
                { label: 'Active Outings', value: stats?.totalOutings, icon: '🌊', tab: 'activity', helper: 'Open activity' },
                { label: 'Crew Requests', value: stats?.totalCrewRequests, icon: '🤝', tab: 'activity', helper: 'Open activity' },
                { label: 'Bug Reports', value: stats?.openBugReports, icon: '🐛', tab: 'inbox', inboxFilter: 'bugs', helper: 'Open bug reports' },
                { label: 'Feature Requests', value: stats?.openFeatureRequests, icon: '⭐', tab: 'inbox', inboxFilter: 'features', helper: 'Open feature requests' },
                { label: 'Messages', value: stats?.openMessages, icon: '💬', tab: 'inbox', inboxFilter: 'messages', helper: 'Open messages' },
                { label: 'Announcements', value: stats?.totalAnnouncements, icon: '📢', tab: 'announcements', helper: 'Open announcements' },
              ].map((stat) => (
                <button
                  key={stat.label}
                  type="button"
                  onClick={() => goToTab(stat.tab, stat.inboxFilter ? { inboxFilter: stat.inboxFilter } : {})}
                  style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0369a1', marginBottom: '4px' }}>{stat.value}</div>
                  <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 800 }}>{stat.label}</div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px', fontWeight: 700 }}>{stat.helper}</div>
                </button>
              ))}
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '16px' }}>⚡ Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {[
                { action: 'announcements', label: '📢 Create Announcement' },
                { action: 'community', label: '👥 View All Users' },
                { action: 'inbox', label: '📬 Check Inbox', options: { inboxFilter: 'all' } },
                { action: 'admins', label: '🔐 Manage Admins' },
              ].map((item) => (
                <button
                  key={item.action}
                  onClick={() => goToTab(item.action, item.options || {})}
                  style={{
                    padding: '16px',
                    background: '#0369a1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.target.style.background = '#06b6d4')}
                  onMouseLeave={(e) => (e.target.style.background = '#0369a1')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* COMMUNITY TAB */}
        {activeTab === 'community' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '24px' }}>👥 Community Management</h2>
            <div style={{ background: '#fef3c7', color: '#92400e', borderLeft: '4px solid #f59e0b', borderRadius: '8px', padding: '16px', marginBottom: '20px', fontWeight: 700, lineHeight: 1.5 }}>
              User accounts have two parts: the login account in Supabase Authentication and the profile row shown here.
              Removing only a profile row does not delete the login account or free the email for fresh signup testing.
              Full user deletion must be done from Supabase Authentication first, then the related profile/data rows.
            </div>
            <div style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>User</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Type</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Joined</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>
                        <button onClick={() => setSelectedUser(u)} style={{ background: 'none', border: 'none', color: '#0369a1', cursor: 'pointer', fontWeight: 700 }}>
                          {u.full_name || 'Unknown'}
                        </button>
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.9rem', color: '#666' }}>{u.email}</td>
                      <td style={{ padding: '12px', fontSize: '0.9rem' }}>
                        <span style={{ background: u.user_type === 'owner' ? '#dcfce7' : '#e0f2fe', color: u.user_type === 'owner' ? '#166534' : '#0c4a6e', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          {u.user_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.9rem', color: '#666' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '12px', fontSize: '0.9rem' }}>
                        {u.role !== 'admin' && (
                          <button onClick={() => handleMakeAdmin(u.id)} style={{ background: '#fbbf24', color: '#000', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
                            Make Admin
                          </button>
                        )}
                        {u.role === 'admin' && (
                          <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
                            Admin
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedUser && (
              <div style={{ marginTop: '32px', background: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '16px' }}>📋 User Details: {selectedUser.full_name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div><strong>Email:</strong> {selectedUser.email}</div>
                  <div><strong>Type:</strong> {selectedUser.user_type}</div>
                  <div><strong>Experience:</strong> {selectedUser.sailing_experience || 'Not specified'}</div>
                  <div><strong>Gender:</strong> {selectedUser.gender || 'Not specified'}</div>
                  <div><strong>Phone:</strong> {selectedUser.phone || 'Not provided'}</div>
                  <div><strong>Joined:</strong> {new Date(selectedUser.created_at).toLocaleDateString()}</div>
                </div>
                {selectedUser.bio && <div style={{ marginTop: '16px' }}><strong>Bio:</strong> {selectedUser.bio}</div>}
                <button onClick={() => setSelectedUser(null)} style={{ marginTop: '16px', padding: '8px 16px', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
                  Close
                </button>
              </div>
            )}
          </div>
        )}

        {/* INBOX TAB */}
        {activeTab === 'inbox' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '24px' }}>📬 Admin Inbox</h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {[
                { key: 'all', label: 'All' },
                { key: 'bugs', label: `Bugs (${bugReports.length})` },
                { key: 'features', label: `Features (${featureRequests.length})` },
                { key: 'messages', label: `Messages (${contactMessages.length})` },
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => {
                    setInboxFilter(filter.key);
                    setSelectedFeedback(null);
                  }}
                  style={{ padding: '10px 14px', borderRadius: '999px', border: '1px solid #cbd5e1', background: inboxFilter === filter.key ? '#0369a1' : '#ffffff', color: inboxFilter === filter.key ? '#ffffff' : '#0f172a', fontWeight: 900, cursor: 'pointer' }}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {(inboxFilter === 'all' || inboxFilter === 'bugs') && renderFeedbackSection('bugs')}
            {(inboxFilter === 'all' || inboxFilter === 'features') && renderFeedbackSection('features')}
            {(inboxFilter === 'all' || inboxFilter === 'messages') && renderFeedbackSection('messages')}
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '24px' }}>📢 Announcements</h2>

            {/* Create Announcement Form */}
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', marginBottom: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '16px' }}>✍️ Create New Announcement</h3>
              <form onSubmit={handleCreateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>Title</label>
                  <input
                    type="text"
                    value={newAnnouncementTitle}
                    onChange={(e) => setNewAnnouncementTitle(e.target.value)}
                    placeholder="Announcement title"
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>Message</label>
                  <textarea
                    value={newAnnouncementMessage}
                    onChange={(e) => setNewAnnouncementMessage(e.target.value)}
                    placeholder="Announcement message"
                    rows={4}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem', fontFamily: 'inherit' }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    background: '#06b6d4',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 900,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.target.style.background = '#22d3ee')}
                  onMouseLeave={(e) => (e.target.style.background = '#06b6d4')}
                >
                  📤 Publish Announcement
                </button>
              </form>
            </div>

            {/* Announcements List */}
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '16px' }}>Recent Announcements</h3>
            {announcements.map((ann) => (
              <div key={ann.id} style={{ background: '#ffffff', padding: '20px', marginBottom: '12px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 900 }}>{ann.title}</h4>
                <p style={{ margin: '8px 0', color: '#666', lineHeight: '1.6' }}>{ann.message}</p>
                <p style={{ margin: '8px 0', fontSize: '0.85rem', color: '#999' }}>Posted {new Date(ann.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '24px' }}>📈 Recent Activity</h2>
            <div style={{ background: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              {recentActivity.map((activity, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => openActivity(activity)}
                  disabled={!activity.id}
                  style={{ width: '100%', padding: '16px', border: 'none', borderBottom: idx < recentActivity.length - 1 ? '1px solid #e5e7eb' : 'none', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: activity.id ? 'pointer' : 'default', textAlign: 'left', gap: '12px' }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#000' }}>
                      {{
                        outing: '🌊 New Outing',
                        crew_request: '🤝 Crew Request',
                        chat: '💬 Chat Message',
                      }[activity.type]}
                    </div>
                    <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#666' }}>{activity.title}</p>
                    <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#999' }}>by {activity.user}</p>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#999', whiteSpace: 'nowrap' }}>{new Date(activity.time).toLocaleString()}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ADMINS TAB */}
        {activeTab === 'admins' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '24px' }}>🔐 Admin Management</h2>

            <div style={{ background: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '32px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Admin Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Role</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Since</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontWeight: 700 }}>{admin.full_name || 'Unknown'}</td>
                      <td style={{ padding: '12px', fontSize: '0.9rem', color: '#666' }}>{admin.email}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '0.9rem' }}>
                          admin
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.9rem', color: '#666' }}>{new Date(admin.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '12px' }}>
                        {admin.id !== user.id && (
                          <button onClick={() => handleRemoveAdmin(admin.id)} style={{ background: '#fca5a5', color: '#7f1d1d', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                            Remove
                          </button>
                        )}
                        {admin.id === user.id && <span style={{ fontSize: '0.9rem', color: '#666' }}>You</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {users && (
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '16px' }}>➕ Add New Admin</h3>
                <p style={{ color: '#666', marginBottom: '16px' }}>Select a user from the Community tab and click "Make Admin"</p>
              </div>
            )}
          </div>
        )}

        {/* MODERATION TAB */}
        {activeTab === 'moderation' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '24px' }}>🚫 Moderation Tools</h2>
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: '1.6', marginTop: 0 }}>
                Moderation currently happens through the live admin areas below. Future-only features are not listed as fake tools.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <button type="button" onClick={() => goToTab('community')} style={{ padding: '16px', background: '#0369a1', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}>
                  View Members
                </button>
                <button type="button" onClick={() => goToTab('inbox', { inboxFilter: 'all' })} style={{ padding: '16px', background: '#0369a1', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}>
                  Review Reports
                </button>
                <button type="button" onClick={() => goToTab('activity')} style={{ padding: '16px', background: '#0369a1', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}>
                  Review Activity
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '24px' }}>📋 Reports & Analytics</h2>
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '16px' }}>Available Reports</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <button type="button" onClick={() => goToTab('overview')} style={{ padding: '16px', background: '#0369a1', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}>
                  System Overview
                </button>
                <button type="button" onClick={() => goToTab('community')} style={{ padding: '16px', background: '#0369a1', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}>
                  Member List
                </button>
                <button type="button" onClick={() => goToTab('inbox', { inboxFilter: 'all' })} style={{ padding: '16px', background: '#0369a1', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}>
                  Support Inbox
                </button>
                <button type="button" onClick={() => goToTab('activity')} style={{ padding: '16px', background: '#0369a1', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}>
                  Recent Activity
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
