import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/supabaseClient';

const checkIsAdmin = async (userId) => {
  try {
    const { data } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', userId)
      .single();
    return !!data;
  } catch {
    return false;
  }
};

const NAV_BG = 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadAnnouncementCount, setUnreadAnnouncementCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);

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
    if (!user) return;

    const checkAdmin = async () => {
      const adminStatus = await checkIsAdmin(user.id);
      setIsAdmin(adminStatus);
    };

    checkAdmin();
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
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px'}}>

            <Link to="/" style={{display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none'}}>
              <img
                src="/Sailing/Club Logo.jpg"
                alt="CGSC"
                style={{height: '40px', width: 'auto', borderRadius: '4px', flexShrink: 0, display: 'block'}}
              />
              <span style={{color: '#ffffff', fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.02em', textShadow: '0 1px 6px rgba(0,0,0,0.6)', whiteSpace: 'nowrap'}}>
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

            {/* Admin Dashboard button */}
            {isAdmin && (
              <button
                onClick={() => navigate('/admin/dashboard')}
                style={{color: '#fbbf24', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', position: 'relative', marginRight: '8px', fontSize: '1.5rem', fontWeight: 900}}
                title="Admin Dashboard"
              >
                ⚙️
              </button>
            )}

            {/* Announcements bell */}
            <button
              onClick={() => navigate('/announcements')}
              style={{color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', position: 'relative', marginRight: '8px'}}
              title="View announcements"
            >
              <svg style={{width: '28px', height: '28px'}} fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20h4c0 1.1-.9 2-2 2s-2-.9-2-2zm10-2v-5c0-3.07-1.64-5.64-4.5-6.32V2h-3v4.68C7.64 7.36 6 9.93 6 13v5H4v2h16v-2h-2z"/>
              </svg>
              {unreadAnnouncementCount > 0 && (
                <span style={{position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#ffffff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900}}>
                  {unreadAnnouncementCount}
                </span>
              )}
            </button>

            {/* Admin inbox bell */}
            {isAdmin && (
              <button
                onClick={() => navigate('/admin/inbox')}
                style={{color: '#fbbf24', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', position: 'relative', marginRight: '8px'}}
                title="Admin inbox"
              >
                <svg style={{width: '28px', height: '28px'}} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V6c0-1.1-.9-2-2-2zm-2 12H4V6h14v10z"/>
                </svg>
                {unreadInboxCount > 0 && (
                  <span style={{position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#ffffff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900}}>
                    {unreadInboxCount}
                  </span>
                )}
              </button>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer', padding: '4px'}}
            >
              <svg style={{width: '32px', height: '32px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div style={{borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '12px', paddingBottom: '16px'}}>
              {user ? (
                <>
                  <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#ffffff', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>⛵ Outings</Link>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#ffffff', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>👤 Profile</Link>
                  <Link to="/bug-report" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#a7f3d0', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>🐛 Report Bug</Link>
                  <Link to="/feature-request" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#a7f3d0', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>⭐ Feature Request</Link>
                  <Link to="/contact-admin" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#a7f3d0', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>📧 Contact Admin</Link>
                  {isAdmin && (
                    <>
                      <Link to="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#fbbf24', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>⚙️ Admin Dashboard</Link>
                      <Link to="/admin/inbox" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#fbbf24', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>📬 Admin Inbox</Link>
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
