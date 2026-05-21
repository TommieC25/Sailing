import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

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

  return (
    <div className="min-h-screen flex flex-col" style={{background: '#f0f4f8'}}>

      {/* Nav */}
      <nav className="sticky top-0 z-50 shadow-lg" style={{background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)'}}>
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-between items-center h-16">

            <Link to="/" className="flex items-center gap-2">
              <img src="/Sailing/Club Logo.jpg" alt="CGSC" className="h-10 w-auto" />
              <span className="text-white text-xl font-black tracking-tight">CGSC Sailing</span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-5">
              {user ? (
                <>
                  <Link to="/" className="text-blue-100 hover:text-white text-lg font-bold">Outings</Link>
                  {profile?.user_type === 'owner' && (
                    <Link to="/skipper-dashboard" className="text-blue-100 hover:text-white text-lg font-bold">My Outings</Link>
                  )}
                  <Link to="/profile" className="text-blue-100 hover:text-white text-lg font-bold">Profile</Link>
                  <button onClick={handleSignOut} className="bg-white text-blue-900 font-black px-4 py-2 rounded-xl text-lg hover:bg-blue-50 transition">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-blue-100 hover:text-white text-lg font-bold">Sign In</Link>
                  <Link to="/signup" className="bg-white text-blue-900 font-black px-4 py-2 rounded-xl text-lg hover:bg-blue-50 transition">Sign Up</Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-white p-1">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-1 border-t border-blue-600 mt-1 pt-3">
              {user ? (
                <>
                  <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-3 text-white text-xl font-bold rounded-xl hover:bg-white hover:bg-opacity-10">⛵ Outings</Link>
                  {profile?.user_type === 'owner' && (
                    <Link to="/skipper-dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-3 text-white text-xl font-bold rounded-xl hover:bg-white hover:bg-opacity-10">📋 My Outings</Link>
                  )}
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-3 text-white text-xl font-bold rounded-xl hover:bg-white hover:bg-opacity-10">👤 Profile</Link>
                  <button onClick={handleSignOut} className="w-full text-left px-3 py-3 text-red-300 text-xl font-bold rounded-xl hover:bg-white hover:bg-opacity-10">
                    🚪 Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-3 text-white text-xl font-bold rounded-xl hover:bg-white hover:bg-opacity-10">Sign In</Link>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-3 text-white text-xl font-bold rounded-xl hover:bg-white hover:bg-opacity-10">Sign Up</Link>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Content — phone-width column */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
