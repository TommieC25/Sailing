import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/supabaseClient';

const NAV_BG = 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadAnnouncementCount, setUnreadAnnouncementCount] = useState(0);
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        // Get all announcements
        const { data: announcements } = await supabase
          .from('announcements')
          .select('id');

        if (!announcements) {
          setUnreadAnnouncementCount(0);
          return;
        }

        // Get viewed announcements for this user
        const { data: viewed } = await supabase
          .from('announcement_views')
          .select('announcement_id')
          .eq('user_id', user.id);

        const viewedIds = new Set(viewed?.map((v) => v.announcement_id) || []);
        const unreadCount = announcements.filter((a) => !viewedIds.has(a.id)).length;
        setUnreadAnnouncementCount(unreadCount);
      } catch (err) {
        console.error('Error fetching unread announcements:', err);
      }
    };

    fetchUnreadCount();
  }, [user]);

  useEffect(() => {
    if (!user || !isAdmin) return;

    const fetchInboxCount = async () => {
      try {
        const [messagesRes, bugsRes, featuresRes] = await Promise.all([
          supabase.from('contact_messages').select('id').eq('status', 'open'),
          supabase.from('bug_reports').select('id').eq('status', 'open'),
          supabase.from('feature_requests').select('id').eq('status', 'open'),
        ]);

        const total =
          (messagesRes.data?.length || 0) +
          (bugsRes.data?.length || 0) +
          (featuresRes.data?.length || 0);

        setUnreadInboxCount(total);
      } catch (err) {
        console.error('Error fetching inbox count:', err);
      }
    };

    fetchInboxCount();
  }, [user, isAdmin]);

  const handleSignOut = async () => {
    try {
      console.log('Starting sign out...');
      setMobileMenuOpen(false);
      await signOut();
      console.log('Sign out complete - ProtectedRoute will redirect');
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
        <div style={{maxWidth: '512px', margin: '0 auto', padding: '0 1rem'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px', gap: '12px'}}>

            <Link to="/" style={{display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', minWidth: 0}}>
              <img
                src="/Sailing/Club Logo.jpg"
                alt="CGSC"
                style={{height: '40px', width: 'auto', borderRadius: '4px', flexShrink: 0, display: 'block'}}
              />
              <span style={{color: '#ffffff', fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.02em', textShadow: '0 1px 6px rgba(0,0,0,0.6)', whiteSpace: 'nowrap', flexShrink: 1}}>
                CGSC Sailing
              </span>
            </Link>

            {/* Desktop links */}
            <div style={{display: 'none'}} className="md-nav-links">
              {user ? (
                <>
                  <Link to="/" style={navLinkStyle}>Outings</Link>
                  {profile?.user_type === 'owner' && (
                    <Link to="/skipper-dashboard" style={navLinkStyle}>My Outings</Link>
                  )}
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
              {/* Announcements bell */}
              <button
                onClick={() => navigate('/announcements')}
                style={{color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', position: 'relative', lineHeight: 0}}
                title="View announcements"
              >
                <svg xmlns="http://www.w3.org/2000/svg" style={{width: '22px', height: '22px', display: 'block'}} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {unreadAnnouncementCount > 0 && (
                  <span style={{position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: '#ffffff', borderRadius: '50%', minWidth: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900, lineHeight: 1, padding: '0 2px'}}>
                    {unreadAnnouncementCount}
                  </span>
                )}
              </button>

              {/* Admin gear */}
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  style={{color: '#fbbf24', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', overflow: 'visible', position: 'relative'}}
                  title="Admin Dashboard"
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
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
                  <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#ffffff', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>⛵ Outings</Link>
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
                      <Link to="/feature-request" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#a7f3d0', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>⭐ Feature Request</Link>
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
                  <Link to="/feature-request" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#a7f3d0', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>⭐ Feature Request</Link>
                  <Link to="/contact-admin" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#a7f3d0', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>📧 Contact Admin</Link>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Content */}
      <main style={{flex: 1, width: '100%', maxWidth: '512px', margin: '0 auto', padding: '24px 16px'}}>
        {children}
      </main>
    </div>
  );
}
