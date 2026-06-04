import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/supabaseClient';
import { todayLocalDateString } from '../../utils/dateUtils';
import { canViewAnnouncement } from '../../utils/announcements';

const NAV_BG = 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)';
const APP_MAX_WIDTH = '1100px';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [unreadAnnouncementCount, setUnreadAnnouncementCount] = useState(0);
  const [unreadInboxCounts, setUnreadInboxCounts] = useState({ messages: 0, bugs: 0, features: 0 });
  const [unreadBugReplyCount, setUnreadBugReplyCount] = useState(0);
  const [unreadFeatureReplyCount, setUnreadFeatureReplyCount] = useState(0);
  const [unreadDirectMessageCount, setUnreadDirectMessageCount] = useState(0);
  const [unreadOutingRequestStatusCount, setUnreadOutingRequestStatusCount] = useState(0);
  const [unreadEventChatItems, setUnreadEventChatItems] = useState([]);
  const [pendingCrewRequestCount, setPendingCrewRequestCount] = useState(0);
  const [isNarrowHeader, setIsNarrowHeader] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth < 430 : false
  ));
  const isAdmin = profile?.role === 'admin';
  const isSkipper = profile?.user_type === 'owner';
  const unreadInboxCount = isAdmin ? unreadInboxCounts.messages + unreadInboxCounts.bugs + unreadInboxCounts.features : 0;
  const unreadEventChatCount = unreadEventChatItems.reduce((total, item) => total + Number(item.unread_count || 0), 0);
  const totalNotificationCount = unreadAnnouncementCount + pendingCrewRequestCount + unreadBugReplyCount + unreadFeatureReplyCount + unreadDirectMessageCount + unreadOutingRequestStatusCount + unreadEventChatCount;
  const adminInboxLink = unreadInboxCounts.messages > 0
    ? '/admin/inbox?tab=messages'
    : unreadInboxCounts.bugs > 0
      ? '/admin/inbox?tab=bugs'
      : unreadInboxCounts.features > 0
        ? '/admin/inbox?tab=features'
        : '/admin/inbox';

  useEffect(() => {
    const updateHeaderWidth = () => setIsNarrowHeader(window.innerWidth < 430);
    updateHeaderWidth();
    window.addEventListener('resize', updateHeaderWidth);
    return () => window.removeEventListener('resize', updateHeaderWidth);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        // Get all announcements
        const { data: announcements } = await supabase
          .from('announcements')
          .select('id, audience');

        if (!announcements) {
          setUnreadAnnouncementCount(0);
          return;
        }

        const visibleAnnouncements = announcements.filter((announcement) => canViewAnnouncement(announcement, profile));

        // Get viewed announcements for this user
        const { data: viewed } = await supabase
          .from('announcement_views')
          .select('announcement_id')
          .eq('user_id', user.id);

        const viewedIds = new Set(viewed?.map((v) => v.announcement_id) || []);
        const unreadCount = visibleAnnouncements.filter((a) => !viewedIds.has(a.id)).length;
        setUnreadAnnouncementCount(unreadCount);
      } catch (err) {
        console.error('Error fetching unread announcements:', err);
      }
    };

    fetchUnreadCount();
    window.addEventListener('sailing:announcements-updated', fetchUnreadCount);

    return () => window.removeEventListener('sailing:announcements-updated', fetchUnreadCount);
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;

    const fetchOutingRequestStatusCount = async () => {
      try {
        const { data, error } = await supabase
          .from('crew_requests')
          .select('id, status, status_changed_at, status_seen_at')
          .eq('crew_id', user.id)
          .in('status', ['approved', 'declined', 'waitlisted']);

        if (error) throw error;
        const unreadCount = (data || []).filter((request) => (
          request.status_changed_at
          && (!request.status_seen_at || new Date(request.status_seen_at) < new Date(request.status_changed_at))
        )).length;
        setUnreadOutingRequestStatusCount(unreadCount);
      } catch (err) {
        console.error('Error fetching outing request status count:', err);
        setUnreadOutingRequestStatusCount(0);
      }
    };

    fetchOutingRequestStatusCount();
    window.addEventListener('sailing:outing-requests-updated', fetchOutingRequestStatusCount);

    return () => window.removeEventListener('sailing:outing-requests-updated', fetchOutingRequestStatusCount);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchEventChatCount = async () => {
      try {
        const { data, error } = await supabase.rpc('my_unread_event_chat_counts');
        if (error) throw error;
        setUnreadEventChatItems(data || []);
      } catch (err) {
        console.error('Error fetching outing chat count:', err);
        setUnreadEventChatItems([]);
      }
    };

    fetchEventChatCount();
    window.addEventListener('sailing:event-chat-updated', fetchEventChatCount);
    window.addEventListener('focus', fetchEventChatCount);
    window.addEventListener('pageshow', fetchEventChatCount);

    const channel = supabase
      .channel(`event-chat-notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'event_chat' },
        fetchEventChatCount
      )
      .subscribe();

    return () => {
      window.removeEventListener('sailing:event-chat-updated', fetchEventChatCount);
      window.removeEventListener('focus', fetchEventChatCount);
      window.removeEventListener('pageshow', fetchEventChatCount);
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchDirectMessageCount = async () => {
      try {
        const { count, error } = await supabase
          .from('direct_messages')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .is('read_at', null);

        if (error) throw error;
        setUnreadDirectMessageCount(count || 0);
      } catch (err) {
        console.error('Error fetching direct message count:', err);
      }
    };

    fetchDirectMessageCount();
    window.addEventListener('sailing:direct-messages-updated', fetchDirectMessageCount);

    return () => window.removeEventListener('sailing:direct-messages-updated', fetchDirectMessageCount);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchFeatureReplyCount = async () => {
      try {
        const { count, error } = await supabase
          .from('feature_request_replies')
          .select('id', { count: 'exact', head: true })
          .is('read_at', null)
          .neq('sender_id', user.id);

        if (error) throw error;
        setUnreadFeatureReplyCount(count || 0);
      } catch (err) {
        console.error('Error fetching feature reply count:', err);
      }
    };

    fetchFeatureReplyCount();
    window.addEventListener('sailing:feature-replies-updated', fetchFeatureReplyCount);

    return () => window.removeEventListener('sailing:feature-replies-updated', fetchFeatureReplyCount);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchBugReplyCount = async () => {
      try {
        const { count, error } = await supabase
          .from('bug_report_replies')
          .select('id', { count: 'exact', head: true })
          .is('read_at', null)
          .neq('sender_id', user.id);

        if (error) throw error;
        setUnreadBugReplyCount(count || 0);
      } catch (err) {
        console.error('Error fetching bug reply count:', err);
      }
    };

    fetchBugReplyCount();
    window.addEventListener('sailing:bug-replies-updated', fetchBugReplyCount);

    return () => window.removeEventListener('sailing:bug-replies-updated', fetchBugReplyCount);
  }, [user]);

  useEffect(() => {
    if (!user || !isAdmin) return;

    const fetchInboxCount = async () => {
      try {
        const [messagesRes, bugsRes, featuresRes] = await Promise.all([
          supabase.from('contact_messages').select('id').eq('status', 'open'),
          supabase.from('bug_reports').select('id').eq('status', 'open'),
          supabase.from('feature_requests').select('id').in('status', ['pending', 'in_development']),
        ]);

        setUnreadInboxCounts({
          messages: messagesRes.data?.length || 0,
          bugs: bugsRes.data?.length || 0,
          features: featuresRes.data?.length || 0,
        });
      } catch (err) {
        console.error('Error fetching inbox count:', err);
      }
    };

    fetchInboxCount();
    window.addEventListener('sailing:admin-inbox-updated', fetchInboxCount);

    return () => window.removeEventListener('sailing:admin-inbox-updated', fetchInboxCount);
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user || !isSkipper) {
      // Reset the skipper badge when a non-skipper or signed-out user is active.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingCrewRequestCount(0);
      return;
    }

    const fetchCrewRequestCount = async () => {
      try {
        const { data: outings, error: outingsError } = await supabase
          .from('outings')
          .select('id')
          .eq('skipper_id', user.id)
          .gte('outing_date', todayLocalDateString());

        if (outingsError) throw outingsError;

        const outingIds = (outings || []).map((outing) => outing.id);
        if (outingIds.length === 0) {
          setPendingCrewRequestCount(0);
          return;
        }

        const { count, error: requestsError } = await supabase
          .from('crew_requests')
          .select('id', { count: 'exact', head: true })
          .in('outing_id', outingIds)
          .eq('status', 'pending');

        if (requestsError) throw requestsError;
        setPendingCrewRequestCount(count || 0);
      } catch (err) {
        console.error('Error fetching crew request count:', err);
      }
    };

    fetchCrewRequestCount();
    window.addEventListener('sailing:crew-requests-updated', fetchCrewRequestCount);

    return () => window.removeEventListener('sailing:crew-requests-updated', fetchCrewRequestCount);
  }, [user, isSkipper]);

  const handleSignOut = async () => {
    try {
      console.log('Starting sign out...');
      setMobileMenuOpen(false);
      setNotificationMenuOpen(false);
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Sign out error:', err);
      alert('Sign out failed: ' + err.message);
    }
  };

  const navLinkStyle = {color: '#ffffff', fontSize: '1.125rem', fontWeight: 700, textDecoration: 'none'};

  return (
    <div style={{minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f0f4f8'}}>

      {/* Nav */}
      <nav style={{background: NAV_BG, position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.3)'}}>
        <div style={{maxWidth: APP_MAX_WIDTH, margin: '0 auto', padding: '0 1rem'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px', gap: '12px'}}>

            <Link to="/" style={{display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', minWidth: 0}}>
              <img
                src="/Sailing/Club Logo.jpg"
                alt="CGSC"
                style={{height: '40px', width: 'auto', borderRadius: '4px', flexShrink: 0, display: 'block'}}
              />
              <span style={{color: '#ffffff', fontSize: isNarrowHeader ? '1.1rem' : '1.2rem', fontWeight: 900, textShadow: '0 1px 6px rgba(0,0,0,0.6)', whiteSpace: 'nowrap', flexShrink: 1, overflow: 'hidden', textOverflow: 'ellipsis'}}>
                {isNarrowHeader ? 'SailAway' : 'SailAway with CGSC'}
              </span>
            </Link>

            {/* Desktop links */}
            <div style={{display: 'none'}} className="md-nav-links">
              {user ? (
                <>
                  <Link to="/" style={navLinkStyle}>Outings</Link>
                  <Link to="/my-outing-requests" style={navLinkStyle}>My Outing Requests</Link>
                  {profile?.user_type === 'owner' && (
                    <Link to="/skipper-dashboard" style={navLinkStyle}>My Outings</Link>
                  )}
                  <Link to="/messages" style={navLinkStyle}>Messages</Link>
                  <Link to="/profile" style={navLinkStyle}>Profile</Link>
                  <button onClick={handleSignOut} style={{background: '#06b6d4', color: '#ffffff', fontWeight: 900, padding: '8px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '1rem'}}>
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" style={navLinkStyle}>Sign In</Link>
                  <Link to="/signup" style={{...navLinkStyle, background: '#06b6d4', color: '#ffffff', padding: '8px 16px', borderRadius: '12px', fontWeight: 900}}>Sign Up</Link>
                </>
              )}
            </div>

            {/* Icons group */}
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0}}>
              {/* Notifications bell */}
              <div style={{position: 'relative'}}>
                <button
                  onClick={() => {
                    setNotificationMenuOpen((open) => !open);
                    setMobileMenuOpen(false);
                  }}
                  style={{color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', position: 'relative', lineHeight: 0}}
                  title="Notifications"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" style={{width: '22px', height: '22px', display: 'block'}} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  {totalNotificationCount > 0 && (
                    <span style={{position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: '#ffffff', borderRadius: '50%', minWidth: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900, lineHeight: 1, padding: '0 2px'}}>
                      {totalNotificationCount}
                    </span>
                  )}
                </button>
                {notificationMenuOpen && (
                  <div style={{position: 'absolute', top: '44px', right: 0, width: '260px', background: '#ffffff', color: '#1e293b', borderRadius: '10px', boxShadow: '0 12px 28px rgba(15,23,42,0.25)', border: '1px solid #dbeafe', overflow: 'hidden', zIndex: 100}}>
                    <div style={{padding: '12px 14px', fontWeight: 900, borderBottom: '1px solid #e2e8f0'}}>Notifications</div>
                    {isSkipper && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationMenuOpen(false);
                          navigate('/skipper-dashboard?show=pending');
                        }}
                        style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', background: 'none', border: 'none', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', color: '#1e293b', textAlign: 'left', fontSize: '1rem', fontWeight: 700}}
                      >
                        <span>Crew requests</span>
                        <span style={{background: pendingCrewRequestCount > 0 ? '#ef4444' : '#e2e8f0', color: pendingCrewRequestCount > 0 ? '#ffffff' : '#475569', borderRadius: '999px', minWidth: '24px', padding: '2px 8px', textAlign: 'center', fontWeight: 900}}>
                          {pendingCrewRequestCount}
                        </span>
                      </button>
                    )}
                    {unreadOutingRequestStatusCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationMenuOpen(false);
                          navigate('/my-outing-requests');
                        }}
                        style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', background: 'none', border: 'none', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', color: '#1e293b', textAlign: 'left', fontSize: '1rem', fontWeight: 700}}
                      >
                        <span>My Outing Requests</span>
                        <span style={{background: '#ef4444', color: '#ffffff', borderRadius: '999px', minWidth: '24px', padding: '2px 8px', textAlign: 'center', fontWeight: 900}}>
                          {unreadOutingRequestStatusCount}
                        </span>
                      </button>
                    )}
                    {unreadBugReplyCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationMenuOpen(false);
                          navigate(isAdmin ? '/admin/inbox?tab=bugs' : '/bug-report');
                        }}
                        style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', background: 'none', border: 'none', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', color: '#1e293b', textAlign: 'left', fontSize: '1rem', fontWeight: 700}}
                      >
                        <span>Bug report replies</span>
                        <span style={{background: '#ef4444', color: '#ffffff', borderRadius: '999px', minWidth: '24px', padding: '2px 8px', textAlign: 'center', fontWeight: 900}}>
                          {unreadBugReplyCount}
                        </span>
                      </button>
                    )}
                    {unreadDirectMessageCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationMenuOpen(false);
                          navigate('/messages');
                        }}
                        style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', background: 'none', border: 'none', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', color: '#1e293b', textAlign: 'left', fontSize: '1rem', fontWeight: 700}}
                      >
                        <span>Messages</span>
                        <span style={{background: '#ef4444', color: '#ffffff', borderRadius: '999px', minWidth: '24px', padding: '2px 8px', textAlign: 'center', fontWeight: 900}}>
                          {unreadDirectMessageCount}
                        </span>
                      </button>
                    )}
                    {unreadEventChatCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationMenuOpen(false);
                          const firstUnreadOuting = unreadEventChatItems[0]?.outing_id;
                          navigate(firstUnreadOuting ? `/outing/${firstUnreadOuting}` : '/');
                        }}
                        style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', background: 'none', border: 'none', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', color: '#1e293b', textAlign: 'left', fontSize: '1rem', fontWeight: 700}}
                      >
                        <span>Outing group chat</span>
                        <span style={{background: '#ef4444', color: '#ffffff', borderRadius: '999px', minWidth: '24px', padding: '2px 8px', textAlign: 'center', fontWeight: 900}}>
                          {unreadEventChatCount}
                        </span>
                      </button>
                    )}
                    {unreadFeatureReplyCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationMenuOpen(false);
                          navigate(isAdmin ? '/admin/inbox?tab=features' : '/feature-request');
                        }}
                        style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', background: 'none', border: 'none', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', color: '#1e293b', textAlign: 'left', fontSize: '1rem', fontWeight: 700}}
                      >
                        <span>Feature request replies</span>
                        <span style={{background: '#ef4444', color: '#ffffff', borderRadius: '999px', minWidth: '24px', padding: '2px 8px', textAlign: 'center', fontWeight: 900}}>
                          {unreadFeatureReplyCount}
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationMenuOpen(false);
                        navigate('/announcements');
                      }}
                      style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#1e293b', textAlign: 'left', fontSize: '1rem', fontWeight: 700}}
                    >
                      <span>Announcements</span>
                      <span style={{background: unreadAnnouncementCount > 0 ? '#ef4444' : '#e2e8f0', color: unreadAnnouncementCount > 0 ? '#ffffff' : '#475569', borderRadius: '999px', minWidth: '24px', padding: '2px 8px', textAlign: 'center', fontWeight: 900}}>
                        {unreadAnnouncementCount}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Admin gear */}
              {isAdmin && (
                <button
                  onClick={() => navigate(unreadInboxCount > 0 ? adminInboxLink : '/admin/dashboard')}
                  style={{color: '#fbbf24', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', overflow: 'visible', position: 'relative'}}
                  title={unreadInboxCount > 0 ? 'Admin Inbox' : 'Admin Dashboard'}
                >
                  <svg style={{width: '28px', height: '28px'}} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                  </svg>
                  {unreadInboxCount > 0 && (
                    <span style={{position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#ffffff', borderRadius: '50%', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, lineHeight: 1, padding: '0 3px'}}>
                      {unreadInboxCount}
                    </span>
                  )}
                </button>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => {
                  setMobileMenuOpen(!mobileMenuOpen);
                  setNotificationMenuOpen(false);
                }}
                style={{color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center'}}
              >
                <svg style={{width: '32px', height: '32px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div style={{borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '12px', paddingBottom: '16px'}}>
              {user ? (
                <>
                  <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#ffffff', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>
                    ⛵ Outings{unreadEventChatCount > 0 ? ` (${unreadEventChatCount})` : ''}
                  </Link>
                  <Link to="/my-outing-requests" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#ffffff', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>
                    📌 My Outing Requests{unreadOutingRequestStatusCount > 0 ? ` (${unreadOutingRequestStatusCount})` : ''}
                  </Link>
                  {isSkipper && (
                    <Link to="/skipper-dashboard" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#ffffff', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>
                      📋 My Outings{pendingCrewRequestCount > 0 ? ` (${pendingCrewRequestCount})` : ''}
                    </Link>
                  )}
                  <Link to="/messages" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#ffffff', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>
                    💬 Messages{unreadDirectMessageCount > 0 ? ` (${unreadDirectMessageCount})` : ''}
                  </Link>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#ffffff', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>👤 Profile</Link>
                  {isAdmin && (
                    <>
                      <Link to="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#fbbf24', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>⚙️ Admin Dashboard</Link>
                      <Link to="/admin/inbox" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#fbbf24', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>📬 Admin Inbox</Link>
                    </>
                  )}
                  {!isAdmin && (
                    <>
                      <Link to="/bug-report" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#a7f3d0', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>🐛 Report Bug</Link>
                      <Link to="/feature-request" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#a7f3d0', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>
                        ⭐ Feature Request{unreadFeatureReplyCount > 0 ? ` (${unreadFeatureReplyCount})` : ''}
                      </Link>
                      <Link to="/contact-admin" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#a7f3d0', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>📧 Contact Admin</Link>
                    </>
                  )}
                  <button onClick={handleSignOut} style={{display: 'block', width: '100%', textAlign: 'left', padding: '12px', color: '#fca5a5', fontSize: '1.25rem', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', borderRadius: '12px'}}>
                    🚪 Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#ffffff', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none'}}>Sign In</Link>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#ffffff', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none'}}>Sign Up</Link>
                  <Link to="/bug-report" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#a7f3d0', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>🐛 Report Bug</Link>
                  <Link to="/feature-request" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#a7f3d0', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>
                    ⭐ Feature Request{unreadFeatureReplyCount > 0 ? ` (${unreadFeatureReplyCount})` : ''}
                  </Link>
                  <Link to="/contact-admin" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#a7f3d0', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>📧 Contact Admin</Link>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Content */}
      <main style={{flex: 1, width: '100%', maxWidth: APP_MAX_WIDTH, margin: '0 auto', padding: '16px 10px'}}>
        {children}
      </main>
    </div>
  );
}
