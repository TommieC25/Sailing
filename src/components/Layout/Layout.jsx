import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const NAV_BG = 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Sign out error:', err);
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
                  <button onClick={handleSignOut} style={{background: '#ffffff', color: '#1e3a5f', fontWeight: 900, padding: '8px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '1rem'}}>
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" style={navLinkStyle}>Sign In</Link>
                  <Link to="/signup" style={{...navLinkStyle, background: '#ffffff', color: '#1e3a5f', padding: '8px 16px', borderRadius: '12px', fontWeight: 900}}>Sign Up</Link>
                </>
              )}
            </div>

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
                  {profile?.user_type === 'owner' && (
                    <Link to="/skipper-dashboard" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#ffffff', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>📋 My Outings</Link>
                  )}
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#ffffff', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none', borderRadius: '12px'}}>👤 Profile</Link>
                  <button onClick={handleSignOut} style={{display: 'block', width: '100%', textAlign: 'left', padding: '12px', color: '#fca5a5', fontSize: '1.25rem', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', borderRadius: '12px'}}>
                    🚪 Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#ffffff', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none'}}>Sign In</Link>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)} style={{display: 'block', padding: '12px', color: '#ffffff', fontSize: '1.25rem', fontWeight: 700, textDecoration: 'none'}}>Sign Up</Link>
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
