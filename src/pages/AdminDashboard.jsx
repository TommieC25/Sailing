import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { isPastLocalDate, todayLocalDateString } from '../utils/dateUtils';
import { shouldSendCourtesyStatus, statusCourtesyMessage } from '../utils/statusMessages';
import { attachBugScreenshotUrls } from '../utils/bugScreenshots';
import { ANNOUNCEMENT_AUDIENCES, announcementAudienceLabel } from '../utils/announcements';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const membersReturnTo = '/admin/dashboard?tab=members';
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [inboxFilter, setInboxFilter] = useState('all');
  const [outingsFilter, setOutingsFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const admins = users.filter((u) => u.role === 'admin');
  const [boats, setBoats] = useState([]);
  const [outings, setOutings] = useState([]);
  const [crewRequests, setCrewRequests] = useState([]);
  const [bugReports, setBugReports] = useState([]);
  const [featureRequests, setFeatureRequests] = useState([]);
  const [contactMessages, setContactMessages] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementMessage, setNewAnnouncementMessage] = useState('');
  const [newAnnouncementAudience, setNewAnnouncementAudience] = useState('all');
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
  const [editingAnnouncementTitle, setEditingAnnouncementTitle] = useState('');
  const [editingAnnouncementMessage, setEditingAnnouncementMessage] = useState('');
  const [editingAnnouncementAudience, setEditingAnnouncementAudience] = useState('all');

  const outingsBySkipperId = outings.reduce((grouped, outing) => {
    if (!outing.skipper_id) return grouped;
    if (!grouped[outing.skipper_id]) grouped[outing.skipper_id] = [];
    grouped[outing.skipper_id].push(outing);
    return grouped;
  }, {});

  const sortMemberOutings = (memberOutings) => [...memberOutings].sort((a, b) => {
    const aPast = isPastLocalDate(a.outing_date);
    const bPast = isPastLocalDate(b.outing_date);
    if (aPast !== bPast) return aPast ? 1 : -1;
    const dateCompare = aPast
      ? b.outing_date.localeCompare(a.outing_date)
      : a.outing_date.localeCompare(b.outing_date);
    if (dateCompare !== 0) return dateCompare;
    return (a.outing_time || '').localeCompare(b.outing_time || '');
  });

  const memberOutingStyle = (outing) => {
    const isPast = isPastLocalDate(outing.outing_date);
    return {
      background: isPast ? '#fee2e2' : '#dcfce7',
      border: `1px solid ${isPast ? '#fca5a5' : '#86efac'}`,
      color: isPast ? '#991b1b' : '#166534',
      borderRadius: '6px',
      padding: '5px 7px',
      cursor: 'pointer',
      fontWeight: 800,
      textAlign: 'left',
      width: '100%',
    };
  };

  const memberOutingDate = (outing) => {
    const dateText = outing.outing_date ? new Date(`${outing.outing_date}T12:00:00`).toLocaleDateString() : 'Date TBD';
    return `${dateText}${isPastLocalDate(outing.outing_date) ? ' · Past' : ''}`;
  };

  const outingCardStyle = (outing) => {
    const isPast = isPastLocalDate(outing.outing_date);
    return {
      background: isPast ? '#fff1f2' : '#f0fdf4',
      border: `1px solid ${isPast ? '#fda4af' : '#86efac'}`,
      borderLeft: `5px solid ${isPast ? '#dc2626' : '#16a34a'}`,
    };
  };

  const memberPhoneDigits = (member) => String(member.phone_number || member.phone || '').replace(/\D/g, '');

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
      const [usersRes, boatsRes, activeOutingsRes, archivedOutingsRes, crewReqRes, bugsRes, featuresRes, msgsRes, announcementRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('boats').select('id', { count: 'exact', head: true }),
        supabase.from('outings').select('id', { count: 'exact', head: true }).gte('outing_date', todayLocalDateString()),
        supabase.from('outings').select('id', { count: 'exact', head: true }).lt('outing_date', todayLocalDateString()),
        supabase.from('crew_requests').select('id', { count: 'exact', head: true }),
        supabase.from('bug_reports').select('id', { count: 'exact', head: true }),
        supabase.from('feature_requests').select('id', { count: 'exact', head: true }),
        supabase.from('contact_messages').select('id', { count: 'exact', head: true }),
        supabase.from('announcements').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalBoats: boatsRes.count || 0,
        activeOutings: activeOutingsRes.count || 0,
        archivedOutings: archivedOutingsRes.count || 0,
        totalCrewRequests: crewReqRes.count || 0,
        openBugReports: bugsRes.count || 0,
        openFeatureRequests: featuresRes.count || 0,
        openMessages: msgsRes.count || 0,
        totalAnnouncements: announcementRes.count || 0,
      });

      // Load detailed data
      const [usersData, boatsData, outingsData, crewRequestsData, bugsData, featuresData, msgsData, announcementsData] = await Promise.all([
        supabase.from('users').select('*').limit(100),
        supabase.from('boats').select('*, users(full_name, email)').order('created_at', { ascending: false }).limit(100),
        supabase.from('outings').select('*, boats(name), users(full_name, email)').order('outing_date', { ascending: true }).limit(100),
        supabase.from('crew_requests').select('*, outings(id, title, outing_date), users(full_name, email, user_type)').order('requested_at', { ascending: false }).limit(100),
        supabase.from('bug_reports').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('feature_requests').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(20),
      ]);

      setUsers(usersData.data || []);
      setBoats(boatsData.data || []);
      setOutings(outingsData.data || []);
      setCrewRequests(crewRequestsData.data || []);
      const [bugsWithSubmitters, featuresWithSubmitters, messagesWithSubmitters] = await Promise.all([
        attachSubmitters(bugsData.data || []),
        attachSubmitters(featuresData.data || []),
        attachSubmitters(msgsData.data || []),
      ]);

      setBugReports(await attachBugScreenshotUrls(supabase, bugsWithSubmitters));
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
          audience: newAnnouncementAudience,
        },
      ]);

      if (error) throw error;

      setNewAnnouncementTitle('');
      setNewAnnouncementMessage('');
      setNewAnnouncementAudience('all');
      await loadDashboardData();
      window.dispatchEvent(new Event('sailing:announcements-updated'));
    } catch (err) {
      setError(err.message);
    }
  };

  const startEditingAnnouncement = (announcement) => {
    setEditingAnnouncementId(announcement.id);
    setEditingAnnouncementTitle(announcement.title || '');
    setEditingAnnouncementMessage(announcement.message || '');
    setEditingAnnouncementAudience(announcement.audience || 'all');
  };

  const cancelEditingAnnouncement = () => {
    setEditingAnnouncementId(null);
    setEditingAnnouncementTitle('');
    setEditingAnnouncementMessage('');
    setEditingAnnouncementAudience('all');
  };

  const handleUpdateAnnouncement = async (e) => {
    e.preventDefault();
    if (!editingAnnouncementId || !editingAnnouncementTitle.trim() || !editingAnnouncementMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .update({
          title: editingAnnouncementTitle,
          message: editingAnnouncementMessage,
          audience: editingAnnouncementAudience,
        })
        .eq('id', editingAnnouncementId);

      if (error) throw error;

      setAnnouncements((current) => current.map((announcement) => (
        announcement.id === editingAnnouncementId
          ? { ...announcement, title: editingAnnouncementTitle, message: editingAnnouncementMessage, audience: editingAnnouncementAudience }
          : announcement
      )));
      cancelEditingAnnouncement();
      window.dispatchEvent(new Event('sailing:announcements-updated'));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateBugReport = async (id, newStatus, item = null) => {
    try {
      const previousStatus = item?.status;
      const { error } = await supabase
        .from('bug_reports')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      if (previousStatus !== newStatus && shouldSendCourtesyStatus('bug_reports', newStatus)) {
        const { error: replyError } = await supabase
          .from('bug_report_replies')
          .insert({
            bug_report_id: id,
            sender_id: user.id,
            message: statusCourtesyMessage('bug_reports', newStatus),
          });

        if (replyError) throw replyError;
        window.dispatchEvent(new Event('sailing:bug-replies-updated'));
      }
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateFeatureRequest = async (id, newStatus, item = null) => {
    try {
      const previousStatus = item?.status;
      const { error } = await supabase
        .from('feature_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      if (previousStatus !== newStatus && shouldSendCourtesyStatus('feature_requests', newStatus)) {
        const { error: replyError } = await supabase
          .from('feature_request_replies')
          .insert({
            feature_request_id: id,
            sender_id: user.id,
            message: statusCourtesyMessage('feature_requests', newStatus),
          });

        if (replyError) throw replyError;
        window.dispatchEvent(new Event('sailing:feature-replies-updated'));
      }
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
    padding: '8px 11px',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    color: '#0f172a',
    fontSize: '0.92rem',
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
    navigate(`/admin/dashboard?tab=${encodeURIComponent(tab)}`, { replace: true });
    if (options.inboxFilter) setInboxFilter(options.inboxFilter);
    setOutingsFilter(tab === 'outings' ? (options.outingsFilter || 'all') : 'all');
    setSelectedFeedback(options.selectedFeedback || null);
  };

  const openFeedback = (type, item) => {
    setInboxFilter(type);
    setSelectedFeedback({ type, item });
  };

  const sortedActiveOutings = [...outings]
    .filter((outing) => !isPastLocalDate(outing.outing_date))
    .sort((a, b) => {
      const dateCompare = a.outing_date.localeCompare(b.outing_date);
      if (dateCompare !== 0) return dateCompare;
      return (a.outing_time || '').localeCompare(b.outing_time || '');
    });
  const sortedArchivedOutings = [...outings]
    .filter((outing) => isPastLocalDate(outing.outing_date))
    .sort((a, b) => {
      const dateCompare = b.outing_date.localeCompare(a.outing_date);
      if (dateCompare !== 0) return dateCompare;
      return (b.outing_time || '').localeCompare(a.outing_time || '');
    });
  const visibleAdminOutings = outingsFilter === 'active'
    ? sortedActiveOutings
    : outingsFilter === 'archived'
      ? sortedArchivedOutings
      : [...sortedActiveOutings, ...sortedArchivedOutings];

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
  const featureDashboardStatusValue = (status) => {
    if (status === 'open') return 'pending';
    if (status === 'in_progress' || status === 'planned') return 'in_development';
    if (status === 'resolved' || status === 'completed') return 'implemented';
    return status || 'pending';
  };

  const openActivity = (activity) => {
    if (activity.type === 'outing' || activity.type === 'crew_request') {
      navigate(`/outing/${activity.id}`);
      return;
    }

    goToTab('activity');
  };

  const renderDataCard = ({ key, title, meta, details, action, onTitleClick, style }) => (
    <div key={key} style={{ background: '#ffffff', padding: '11px 12px', marginBottom: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 240px' }}>
          {onTitleClick ? (
            <button
              type="button"
              onClick={onTitleClick}
              style={{ margin: '0 0 4px', color: '#0369a1', fontSize: '1rem', fontWeight: 900, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
            >
              {title}
            </button>
          ) : (
            <h3 style={{ margin: '0 0 4px', color: '#0f172a', fontSize: '1rem', fontWeight: 900 }}>{title}</h3>
          )}
          {meta && <p style={{ margin: '0 0 4px', color: '#334155', fontWeight: 700, fontSize: '0.88rem' }}>{meta}</p>}
          {details && <p style={{ margin: 0, color: '#64748b', fontWeight: 600, fontSize: '0.86rem', lineHeight: 1.35 }}>{details}</p>}
        </div>
        {action}
      </div>
    </div>
  );

  const renderFeedbackSection = (type) => {
    const config = feedbackConfig[type];
    const openItems = config.items.filter((item) => (
      type === 'features'
        ? featureDashboardStatusValue(item.status) !== 'implemented'
        : item.status === 'open'
    )).length;

    return (
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '10px' }}>
          {config.icon} {config.title} ({openItems} {type === 'features' ? 'active' : 'open'} / {config.items.length} total)
        </h3>
        {config.items.length === 0 ? (
          <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', color: '#64748b', fontWeight: 700 }}>
            No {config.tableLabel}s yet.
          </div>
        ) : (
          config.items.map((item) => {
            const isSelected = selectedFeedback?.type === type && selectedFeedback?.item?.id === item.id;
            return (
              <div key={item.id} style={{ background: '#ffffff', padding: '12px', marginBottom: '8px', borderRadius: '8px', borderLeft: `4px solid ${config.accent}`, boxShadow: isSelected ? '0 0 0 3px #bfdbfe' : '0 1px 2px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <button
                    type="button"
                    onClick={() => type === 'bugs'
                      ? navigate(`/bug-report/${item.id}?returnTo=${encodeURIComponent('/admin/dashboard')}`)
                      : type === 'features'
                        ? navigate(`/feature-request/${item.id}?returnTo=${encodeURIComponent('/admin/dashboard')}`)
                        : openFeedback(type, item)}
                    style={{ minWidth: 0, flex: '1 1 240px', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    <h4 style={{ margin: 0, fontWeight: 900, color: '#0369a1', fontSize: '1rem' }}>{feedbackTitle(type, item)}</h4>
                    <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#475569', lineHeight: 1.38, whiteSpace: 'pre-wrap' }}>
                      {isSelected ? feedbackBody(type, item) : `${feedbackBody(type, item)?.substring(0, 180) || ''}${feedbackBody(type, item)?.length > 180 ? '...' : ''}`}
                    </p>
                    <p style={{ margin: '3px 0', fontSize: '0.86rem', color: '#334155', fontWeight: 700 }}>From: {submitterText(item)}</p>
                    <p style={{ margin: '3px 0', fontSize: '0.8rem', color: '#64748b' }}>Submitted {new Date(item.created_at).toLocaleString()}</p>
                  </button>
                  <div style={{ display: 'grid', gap: '6px', minWidth: '140px' }}>
                    <select
                      value={type === 'features' ? featureDashboardStatusValue(item.status) : item.status}
                      onChange={(e) => config.statusHandler(item.id, e.target.value, item)}
                      style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontWeight: 700, background: '#ffffff' }}
                    >
                      {type === 'features' ? (
                        <>
                          <option value="pending">Pending</option>
                          <option value="in_development">In Development</option>
                          <option value="implemented">Implemented</option>
                        </>
                      ) : (
                        <>
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </>
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => type === 'bugs'
                        ? navigate(`/bug-report/${item.id}?returnTo=${encodeURIComponent('/admin/dashboard')}`)
                        : type === 'features'
                          ? navigate(`/feature-request/${item.id}?returnTo=${encodeURIComponent('/admin/dashboard')}`)
                          : openFeedback(type, item)}
                      style={{ padding: '7px 10px', borderRadius: '6px', border: 'none', background: '#0369a1', color: '#ffffff', fontWeight: 900, cursor: 'pointer' }}
                    >
                      {type === 'bugs' || type === 'features' ? 'Open Thread' : isSelected ? 'Open' : 'View'}
                    </button>
                    {type === 'bugs' && (
                      <button
                        type="button"
                        onClick={() => navigate(`/bug-report/${item.id}?returnTo=${encodeURIComponent('/admin/dashboard')}`)}
                        style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #0369a1', background: '#e0f2fe', color: '#0369a1', fontWeight: 900, cursor: 'pointer' }}
                      >
                        Reply
                      </button>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <div style={{ marginTop: '8px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 8px', color: '#0f172a', fontWeight: 900 }}>Full {config.tableLabel}</p>
                    <p style={{ margin: 0, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{feedbackBody(type, item)}</p>
                    {type === 'bugs' && item.screenshot_display_url && (
                      <a href={item.screenshot_display_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '12px', color: '#0369a1', fontWeight: 900 }}>
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
      <div style={{ background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)', padding: '16px 18px', color: '#ffffff' }}>
        <h1 style={{ margin: 0, fontSize: '1.55rem', fontWeight: 900 }}>⚙️ Admin Dashboard</h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.92rem', color: '#a5f3fc' }}>Community Management & Monitoring</p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', margin: '12px', borderRadius: '8px', fontWeight: 700 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ background: '#ffffff', borderBottom: '2px solid #e5e7eb', padding: '8px 10px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '6px', minWidth: 'max-content' }}>
        {['overview', 'members', 'boats', 'outings', 'crewRequests', 'inbox', 'announcements', 'activity', 'admins', 'moderation', 'reports'].map((tab) => (
          <button
            key={tab}
            onClick={() => goToTab(tab)}
            style={activeTab === tab ? activeTabStyle : tabStyle}
          >
            {{
              overview: '📊 Overview',
              members: '👥 Members',
              boats: '⛵ Boats',
              outings: '🌊 Outings',
              crewRequests: '🤝 Crew Requests',
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
      <div style={{ padding: '14px 12px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 12px' }}>System Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '7px', marginBottom: '18px' }}>
              {[
                { label: 'Total Members', value: stats?.totalUsers, icon: '👥', tab: 'members' },
                { label: 'Total Boats', value: stats?.totalBoats, icon: '⛵', tab: 'boats' },
                { label: 'Active Outings', value: stats?.activeOutings, icon: '🌊', tab: 'outings', outingsFilter: 'active' },
                { label: 'Archived Outings', value: stats?.archivedOutings, icon: '🗄️', tab: 'outings', outingsFilter: 'archived' },
                { label: 'Crew Requests', value: stats?.totalCrewRequests, icon: '🤝', tab: 'crewRequests' },
                { label: 'Bug Reports', value: stats?.openBugReports, icon: '🐛', tab: 'inbox', inboxFilter: 'bugs' },
                { label: 'Feature Requests', value: stats?.openFeatureRequests, icon: '⭐', tab: 'inbox', inboxFilter: 'features' },
                { label: 'Messages', value: stats?.openMessages, icon: '💬', tab: 'inbox', inboxFilter: 'messages' },
                { label: 'Announcements', value: stats?.totalAnnouncements, icon: '📢', tab: 'announcements' },
              ].map((stat) => (
                <button
                  key={stat.label}
                  type="button"
                  onClick={() => goToTab(stat.tab, { inboxFilter: stat.inboxFilter, outingsFilter: stat.outingsFilter })}
                  style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', cursor: 'pointer', textAlign: 'left', display: 'grid', gridTemplateColumns: '28px 1fr auto', alignItems: 'center', gap: '8px', minHeight: '40px', width: '100%' }}
                >
                  <span style={{ fontSize: '1.05rem', lineHeight: 1, width: '28px', textAlign: 'center' }}>{stat.icon}</span>
                  <span style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stat.label}</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0369a1', minWidth: '32px', textAlign: 'right' }}>{stat.value}</span>
                </button>
              ))}
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: '0 0 10px' }}>⚡ Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
              {[
                { action: 'announcements', label: '📢 Create Announcement' },
                { action: 'members', label: '👥 View Members' },
                { action: 'inbox', label: '📬 Check Inbox', options: { inboxFilter: 'all' } },
                { action: 'admins', label: '🔐 Manage Admins' },
              ].map((item) => (
                <button
                  key={item.action}
                  onClick={() => goToTab(item.action, item.options || {})}
                  style={{
                    padding: '10px 12px',
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

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 12px' }}>👥 Member Management</h2>
            <div style={{ background: '#ffffff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>User</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Email</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Type</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Outings</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Phone</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const memberOutings = sortMemberOutings(outingsBySkipperId[u.id] || []);
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <button onClick={() => navigate(`/profile/${u.id}?returnTo=${encodeURIComponent(membersReturnTo)}`)} style={{ background: 'none', border: 'none', color: '#0369a1', cursor: 'pointer', fontWeight: 700 }}>
                            {u.full_name || 'Unknown'}
                          </button>
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '0.86rem', color: '#666' }}>{u.email}</td>
                        <td style={{ padding: '8px 10px', fontSize: '0.86rem' }}>
                          <span style={{ background: u.user_type === 'owner' ? '#dcfce7' : '#e0f2fe', color: u.user_type === 'owner' ? '#166534' : '#0c4a6e', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            {u.user_type}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '0.86rem', minWidth: '180px' }}>
                          {u.user_type === 'owner' ? (
                            memberOutings.length > 0 ? (
                              <div style={{ display: 'grid', gap: '6px' }}>
                                {memberOutings.map((outing) => (
                                  <button
                                    key={outing.id}
                                    type="button"
                                    onClick={() => navigate(`/outing/${outing.id}?returnTo=${encodeURIComponent(membersReturnTo)}`)}
                                    style={memberOutingStyle(outing)}
                                  >
                                    {outing.title} · {memberOutingDate(outing)}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: '#64748b', fontWeight: 700 }}>No outings</span>
                            )
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '0.86rem' }}>
                          {memberPhoneDigits(u) ? (
                            <a href={`tel:${memberPhoneDigits(u)}`} style={{ color: '#0369a1', fontWeight: 800, textDecoration: 'none' }}>
                              {u.phone || u.phone_number}
                            </a>
                          ) : (
                            <span style={{ color: '#94a3b8', fontWeight: 700 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '0.86rem' }}>
                          {u.id !== user?.id && (
                            <button onClick={() => navigate(`/messages/${u.id}?returnTo=${encodeURIComponent(membersReturnTo)}`)} style={{ background: '#0369a1', color: '#ffffff', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, marginRight: '8px' }}>
                              Message
                            </button>
                          )}
                          {u.id === user?.id && (
                            <span style={{ color: '#94a3b8', fontWeight: 700 }}>—</span>
                          )}
                          {u.role === 'admin' && (
                            <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
                              Admin
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BOATS TAB */}
        {activeTab === 'boats' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 12px' }}>⛵ Boats</h2>
            {boats.length === 0 ? (
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>No boats registered yet.</div>
            ) : (
              boats.map((boat) => renderDataCard({
                key: boat.id,
                title: boat.name || 'Unnamed boat',
                meta: `Owner: ${boat.users?.full_name || 'Unknown owner'}${boat.users?.email ? ` • ${boat.users.email}` : ''}`,
                details: [
                  boat.size_ft ? `${boat.size_ft} ft` : null,
                  boat.capacity ? `${boat.capacity} capacity` : null,
                  boat.mooring_location ? `Mooring: ${boat.mooring_location}` : null,
                ].filter(Boolean).join(' • ') || 'No boat details entered',
                onTitleClick: boat.owner_id ? () => navigate(`/profile/${boat.owner_id}?returnTo=${encodeURIComponent('/admin/dashboard')}`) : null,
                action: boat.owner_id ? (
                  <button type="button" onClick={() => navigate(`/profile/${boat.owner_id}?returnTo=${encodeURIComponent('/admin/dashboard')}`)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#0369a1', color: '#ffffff', fontWeight: 900, cursor: 'pointer' }}>
                    Owner Profile
                  </button>
                ) : null,
              }))
            )}
          </div>
        )}

        {/* OUTINGS TAB */}
        {activeTab === 'outings' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>
                🌊 {outingsFilter === 'active' ? 'Active Outings' : outingsFilter === 'archived' ? 'Archived Outings' : 'All Outings'}
              </h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { key: 'all', label: `All (${outings.length})` },
                  { key: 'active', label: `Active (${sortedActiveOutings.length})` },
                  { key: 'archived', label: `Past (${sortedArchivedOutings.length})` },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setOutingsFilter(filter.key)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '999px',
                      border: outingsFilter === filter.key ? '2px solid #0369a1' : '1px solid #cbd5e1',
                      background: outingsFilter === filter.key ? '#e0f2fe' : '#ffffff',
                      color: outingsFilter === filter.key ? '#075985' : '#475569',
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            {visibleAdminOutings.length === 0 ? (
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>No outings posted yet.</div>
            ) : (
              visibleAdminOutings.map((outing) => renderDataCard({
                key: outing.id,
                title: outing.title || 'Untitled outing',
                onTitleClick: () => navigate(`/outing/${outing.id}?returnTo=${encodeURIComponent('/admin/dashboard?tab=outings')}`),
                meta: `Skipper: ${outing.users?.full_name || 'Unknown skipper'}${outing.users?.email ? ` • ${outing.users.email}` : ''}`,
                details: [
                  isPastLocalDate(outing.outing_date) ? 'Archived' : 'Active',
                  outing.outing_date ? `Date: ${outing.outing_date}` : null,
                  outing.outing_time ? `Time: ${outing.outing_time}` : null,
                  outing.boats?.name ? `Boat: ${outing.boats.name}` : null,
                  outing.location ? `Location: ${outing.location}` : null,
                  `${outing.capacity_available ?? 0} crew spots`,
                ].filter(Boolean).join(' • '),
                style: outingCardStyle(outing),
                action: (
                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                    {outing.skipper_id && (
                      <button type="button" onClick={() => navigate(`/profile/${outing.skipper_id}?returnTo=${encodeURIComponent('/admin/dashboard')}`)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#e0f2fe', color: '#0369a1', fontWeight: 900, cursor: 'pointer' }}>
                        Skipper
                      </button>
                    )}
                    <button type="button" onClick={() => navigate(`/outing/${outing.id}?returnTo=${encodeURIComponent('/admin/dashboard?tab=outings')}`)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#0369a1', color: '#ffffff', fontWeight: 900, cursor: 'pointer' }}>
                      Outing
                    </button>
                  </div>
                ),
              }))
            )}
          </div>
        )}

        {/* CREW REQUESTS TAB */}
        {activeTab === 'crewRequests' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 12px' }}>🤝 Crew Requests</h2>
            {crewRequests.length === 0 ? (
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>No crew requests yet.</div>
            ) : (
              crewRequests.map((request) => renderDataCard({
                key: request.id,
                title: `${request.status || 'unknown'} request for ${request.outings?.title || 'unknown outing'}`,
                onTitleClick: request.outing_id ? () => navigate(`/outing/${request.outing_id}`) : null,
                meta: `Crew: ${request.users?.full_name || 'Unknown member'}${request.users?.email ? ` • ${request.users.email}` : ''}`,
                details: [
                  request.users?.user_type ? `Type: ${request.users.user_type}` : null,
                  request.requested_at ? `Requested: ${new Date(request.requested_at).toLocaleString()}` : null,
                  request.responded_at ? `Responded: ${new Date(request.responded_at).toLocaleString()}` : null,
                ].filter(Boolean).join(' • '),
                action: (
                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                    {request.crew_id && (
                      <button type="button" onClick={() => navigate(`/profile/${request.crew_id}?returnTo=${encodeURIComponent('/admin/dashboard')}`)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#e0f2fe', color: '#0369a1', fontWeight: 900, cursor: 'pointer' }}>
                        Crew
                      </button>
                    )}
                    {request.outing_id && (
                      <button type="button" onClick={() => navigate(`/outing/${request.outing_id}`)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#0369a1', color: '#ffffff', fontWeight: 900, cursor: 'pointer' }}>
                        Outing
                      </button>
                    )}
                  </div>
                ),
              }))
            )}
          </div>
        )}

        {/* INBOX TAB */}
        {activeTab === 'inbox' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 12px' }}>📬 Admin Inbox</h2>
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '12px' }}>
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
                  style={{ padding: '7px 10px', borderRadius: '999px', border: '1px solid #cbd5e1', background: inboxFilter === filter.key ? '#0369a1' : '#ffffff', color: inboxFilter === filter.key ? '#ffffff' : '#0f172a', fontWeight: 900, cursor: 'pointer' }}
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 12px' }}>📢 Announcements</h2>

            {/* Create Announcement Form */}
            <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', marginBottom: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: '0 0 10px' }}>✍️ Create New Announcement</h3>
              <form onSubmit={handleCreateAnnouncement} style={{ display: 'grid', gap: '10px' }}>
                <div>
                  <label style={{ fontWeight: 700, marginBottom: '5px', display: 'block' }}>Title</label>
                  <input
                    type="text"
                    value={newAnnouncementTitle}
                    onChange={(e) => setNewAnnouncementTitle(e.target.value)}
                    placeholder="Announcement title"
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 700, marginBottom: '5px', display: 'block' }}>Audience</label>
                  <select
                    value={newAnnouncementAudience}
                    onChange={(e) => setNewAnnouncementAudience(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem', fontWeight: 800, background: '#ffffff' }}
                  >
                    {ANNOUNCEMENT_AUDIENCES.map((audience) => (
                      <option key={audience.value} value={audience.value}>{audience.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 700, marginBottom: '5px', display: 'block' }}>Message</label>
                  <textarea
                    value={newAnnouncementMessage}
                    onChange={(e) => setNewAnnouncementMessage(e.target.value)}
                    placeholder="Announcement message"
                    rows={4}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem', fontFamily: 'inherit' }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    padding: '10px 14px',
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
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: '0 0 10px' }}>Recent Announcements</h3>
            {announcements.map((ann) => {
              const isEditing = editingAnnouncementId === ann.id;
              return (
                <div key={ann.id} style={{ background: '#ffffff', padding: '12px', marginBottom: '8px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  {isEditing ? (
                    <form onSubmit={handleUpdateAnnouncement} style={{ display: 'grid', gap: '8px' }}>
                      <input
                        type="text"
                        value={editingAnnouncementTitle}
                        onChange={(e) => setEditingAnnouncementTitle(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 800 }}
                      />
                      <textarea
                        value={editingAnnouncementMessage}
                        onChange={(e) => setEditingAnnouncementMessage(e.target.value)}
                        rows={4}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical' }}
                      />
                      <select
                        value={editingAnnouncementAudience}
                        onChange={(e) => setEditingAnnouncementAudience(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontWeight: 800, background: '#ffffff' }}
                      >
                        {ANNOUNCEMENT_AUDIENCES.map((audience) => (
                          <option key={audience.value} value={audience.value}>{audience.label}</option>
                        ))}
                      </select>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="submit"
                          disabled={!editingAnnouncementTitle.trim() || !editingAnnouncementMessage.trim()}
                          style={{ padding: '9px 12px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#ffffff', fontWeight: 900, cursor: 'pointer', opacity: !editingAnnouncementTitle.trim() || !editingAnnouncementMessage.trim() ? 0.6 : 1 }}
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingAnnouncement}
                          style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 900, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 900 }}>{ann.title}</h4>
                        <button
                          type="button"
                          onClick={() => startEditingAnnouncement(ann)}
                          style={{ padding: '7px 10px', borderRadius: '8px', border: 'none', background: '#e0f2fe', color: '#0369a1', fontWeight: 900, cursor: 'pointer', flexShrink: 0 }}
                        >
                          Edit
                        </button>
                      </div>
                      <p style={{ margin: '6px 0', color: '#666', lineHeight: '1.42', whiteSpace: 'pre-wrap' }}>{ann.message}</p>
                      <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#999' }}>
                        Posted {new Date(ann.created_at).toLocaleDateString()} • Audience: {announcementAudienceLabel(ann.audience)}
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 12px' }}>📈 Recent Activity</h2>
            <div style={{ background: '#ffffff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              {recentActivity.map((activity, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => openActivity(activity)}
                  disabled={!activity.id}
                  style={{ width: '100%', padding: '10px 12px', border: 'none', borderBottom: idx < recentActivity.length - 1 ? '1px solid #e5e7eb' : 'none', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: activity.id ? 'pointer' : 'default', textAlign: 'left', gap: '10px' }}
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 12px' }}>🔐 Admin Management</h2>

            <div style={{ background: '#ffffff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Admin Name</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Email</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Role</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Since</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{admin.full_name || 'Unknown'}</td>
                      <td style={{ padding: '8px 10px', fontSize: '0.86rem', color: '#666' }}>{admin.email}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '0.9rem' }}>
                          admin
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: '0.86rem', color: '#666' }}>{new Date(admin.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '8px 10px' }}>
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
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 900, margin: '0 0 6px' }}>➕ Add New Admin</h3>
                <p style={{ color: '#666', margin: 0 }}>Select a user from the Community tab and click "Make Admin"</p>
              </div>
            )}
          </div>
        )}

        {/* MODERATION TAB */}
        {activeTab === 'moderation' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 12px' }}>🚫 Moderation Tools</h2>
            <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.4', margin: '0 0 10px' }}>
                Moderation currently happens through the live admin areas below. Future-only features are not listed as fake tools.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                <button type="button" onClick={() => goToTab('members')} style={{ padding: '10px 12px', background: '#0369a1', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}>
                  View Members
                </button>
                <button type="button" onClick={() => goToTab('inbox', { inboxFilter: 'all' })} style={{ padding: '10px 12px', background: '#0369a1', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}>
                  Review Reports
                </button>
                <button type="button" onClick={() => goToTab('activity')} style={{ padding: '10px 12px', background: '#0369a1', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}>
                  Review Activity
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 12px' }}>📋 Reports & Analytics</h2>
            <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 900, margin: '0 0 10px' }}>Available Reports</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                <button type="button" onClick={() => goToTab('overview')} style={{ padding: '10px 12px', background: '#0369a1', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}>
                  System Overview
                </button>
                <button type="button" onClick={() => goToTab('members')} style={{ padding: '10px 12px', background: '#0369a1', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}>
                  Member List
                </button>
                <button type="button" onClick={() => goToTab('inbox', { inboxFilter: 'all' })} style={{ padding: '10px 12px', background: '#0369a1', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}>
                  Support Inbox
                </button>
                <button type="button" onClick={() => goToTab('activity')} style={{ padding: '10px 12px', background: '#0369a1', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}>
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
