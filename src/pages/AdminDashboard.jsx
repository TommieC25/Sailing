import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
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
  const [newAdminEmail, setNewAdminEmail] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
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
      setBugReports(bugsData.data || []);
      setFeatureRequests(featuresData.data || []);
      setContactMessages(msgsData.data || []);
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
  };

  const loadRecentActivity = async () => {
    try {
      const [outingsData, crewData, chatData] = await Promise.all([
        supabase.from('outings').select('id, title, skipper_id, created_at, users(full_name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('crew_requests').select('id, status, created_at, outings(title), users(full_name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('general_chat').select('message, created_at, users(full_name)').order('created_at', { ascending: false }).limit(10),
      ]);

      return [
        ...(outingsData.data || []).map(o => ({ type: 'outing', title: o.title, user: o.users?.full_name, time: o.created_at })),
        ...(crewData.data || []).map(c => ({ type: 'crew_request', title: `${c.status} crew request for ${c.outings?.title}`, user: c.users?.full_name, time: c.created_at })),
        ...(chatData.data || []).map(c => ({ type: 'chat', title: c.message?.substring(0, 50), user: c.users?.full_name, time: c.created_at })),
      ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 20);
    } catch (err) {
      console.error('Error loading activity:', err);
      return [];
    }
  };

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
      const { error } = await supabase.from('admins').insert([
        { user_id: userId, role: 'co-admin' },
      ]);

      if (error && error.code !== '23505') throw error; // 23505 = unique constraint
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveAdmin = async (adminId) => {
    try {
      const { error } = await supabase.from('admins').delete().eq('id', adminId);
      if (error) throw error;
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    }
  };

  const tabStyle = {
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    transition: 'all 0.2s',
  };

  const activeTabStyle = {
    ...tabStyle,
    borderBottomColor: '#06b6d4',
    color: '#a5f3fc',
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
      <div style={{ background: '#ffffff', borderBottom: '2px solid #e5e7eb', paddingLeft: '16px', overflowX: 'auto' }}>
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

      {/* Content Area */}
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '24px' }}>System Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              {[
                { label: 'Total Users', value: stats?.totalUsers, icon: '👥' },
                { label: 'Total Boats', value: stats?.totalBoats, icon: '⛵' },
                { label: 'Active Outings', value: stats?.totalOutings, icon: '🌊' },
                { label: 'Crew Requests', value: stats?.totalCrewRequests, icon: '🤝' },
                { label: 'Bug Reports', value: stats?.openBugReports, icon: '🐛' },
                { label: 'Feature Requests', value: stats?.openFeatureRequests, icon: '⭐' },
                { label: 'Messages', value: stats?.openMessages, icon: '💬' },
                { label: 'Announcements', value: stats?.totalAnnouncements, icon: '📢' },
              ].map((stat) => (
                <div key={stat.label} style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0369a1', marginBottom: '4px' }}>{stat.value}</div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '16px' }}>⚡ Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {[
                { action: 'announcements', label: '📢 Create Announcement' },
                { action: 'community', label: '👥 View All Users' },
                { action: 'inbox', label: '📬 Check Inbox' },
                { action: 'admins', label: '🔐 Manage Admins' },
              ].map((item) => (
                <button
                  key={item.action}
                  onClick={() => setActiveTab(item.action)}
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
                        {!admins.find((a) => a.user_id === u.id) && (
                          <button onClick={() => handleMakeAdmin(u.id)} style={{ background: '#fbbf24', color: '#000', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
                            Make Admin
                          </button>
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

            {/* Bug Reports */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '16px' }}>🐛 Bug Reports ({bugReports.filter((b) => b.status === 'open').length})</h3>
              {bugReports.slice(0, 10).map((bug) => (
                <div key={bug.id} style={{ background: '#ffffff', padding: '16px', marginBottom: '12px', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 900, color: '#000' }}>{bug.title}</h4>
                      <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#666' }}>{bug.description?.substring(0, 100)}...</p>
                      <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#999' }}>Submitted {new Date(bug.created_at).toLocaleDateString()}</p>
                    </div>
                    <select
                      value={bug.status}
                      onChange={(e) => handleUpdateBugReport(bug.id, e.target.value)}
                      style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', fontWeight: 600 }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature Requests */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '16px' }}>⭐ Feature Requests ({featureRequests.filter((f) => f.status === 'open').length})</h3>
              {featureRequests.slice(0, 10).map((feature) => (
                <div key={feature.id} style={{ background: '#ffffff', padding: '16px', marginBottom: '12px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 900, color: '#000' }}>{feature.title}</h4>
                      <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#666' }}>{feature.description?.substring(0, 100)}...</p>
                      <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#999' }}>Submitted {new Date(feature.created_at).toLocaleDateString()}</p>
                    </div>
                    <select
                      value={feature.status}
                      onChange={(e) => handleUpdateFeatureRequest(feature.id, e.target.value)}
                      style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', fontWeight: 600 }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="planned">Planned</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact Messages */}
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '16px' }}>💬 Contact Messages ({contactMessages.filter((m) => m.status === 'open').length})</h3>
              {contactMessages.slice(0, 10).map((msg) => (
                <div key={msg.id} style={{ background: '#ffffff', padding: '16px', marginBottom: '12px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 900, color: '#000' }}>{msg.subject}</h4>
                      <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#666' }}>{msg.message?.substring(0, 100)}...</p>
                      <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#999' }}>Submitted {new Date(msg.created_at).toLocaleDateString()}</p>
                    </div>
                    <select
                      value={msg.status}
                      onChange={(e) => handleUpdateMessage(msg.id, e.target.value)}
                      style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', fontWeight: 600 }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
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
                <div key={idx} style={{ padding: '16px', borderBottom: idx < recentActivity.length - 1 ? '1px solid #e5e7eb' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                </div>
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
                      <td style={{ padding: '12px', fontWeight: 700 }}>{admin.users?.full_name || 'Unknown'}</td>
                      <td style={{ padding: '12px', fontSize: '0.9rem', color: '#666' }}>{admin.users?.email}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '0.9rem' }}>
                          {admin.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.9rem', color: '#666' }}>{new Date(admin.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '12px' }}>
                        {admin.user_id !== user.id && (
                          <button onClick={() => handleRemoveAdmin(admin.id)} style={{ background: '#fca5a5', color: '#7f1d1d', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                            Remove
                          </button>
                        )}
                        {admin.user_id === user.id && <span style={{ fontSize: '0.9rem', color: '#666' }}>You</span>}
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
              <p style={{ fontSize: '1.1rem', color: '#666', lineHeight: '1.6' }}>
                Moderation features include:
              </p>
              <ul style={{ fontSize: '1rem', color: '#666', lineHeight: '1.8' }}>
                <li>✅ View all user-generated content</li>
                <li>✅ Flag inappropriate chat messages (coming soon)</li>
                <li>✅ Suspend/ban users (coming soon)</li>
                <li>✅ Delete inappropriate photos (coming soon)</li>
                <li>✅ Audit logs (coming soon)</li>
              </ul>
              <div style={{ marginTop: '24px', padding: '16px', background: '#fef3c7', borderRadius: '8px', borderLeft: '4px solid #fbbf24' }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#92400e' }}>💡 Tip: Community reports appear in the Inbox tab. Review and resolve them there.</p>
              </div>
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '24px' }}>📋 Reports & Analytics</h2>
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '16px' }}>📊 Available Reports</h3>
              <ul style={{ fontSize: '1rem', color: '#666', lineHeight: '1.8' }}>
                <li>✅ User Growth Report (coming soon)</li>
                <li>✅ Outing Activity Report (coming soon)</li>
                <li>✅ Community Engagement Report (coming soon)</li>
                <li>✅ Support Tickets Report (coming soon)</li>
                <li>✅ Export User List as CSV (coming soon)</li>
              </ul>
              <div style={{ marginTop: '24px', padding: '16px', background: '#dbeafe', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#0c4a6e' }}>📈 Current system stats available in Overview tab</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
