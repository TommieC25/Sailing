import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function LoginForm() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await signIn(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-500 px-4 py-6">
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">

        {/* Logo + Title */}
        <div className="text-center mb-8">
          <img src="/Sailing/Club Logo.jpg" alt="CGSC Logo" className="h-24 w-auto mx-auto mb-4 drop-shadow-2xl" />
          <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-lg mb-1">Welcome to CGSC</h1>
          <p className="text-white text-3xl font-black">Where Sailors Meet Adventures</p>
        </div>

        {/* Ready to sail */}
        <div className="bg-white bg-opacity-15 backdrop-blur rounded-2xl p-6 mb-6">
          <p className="text-white text-3xl font-black mb-3">Ready to sail? 🌊</p>
          <p className="text-white text-xl font-semibold leading-relaxed">
            You're part of a community of sailors at Coconut Grove Sailing Club. Whether you own a boat or love crewing, this app connects you with people and outings.
          </p>
        </div>

        {/* Here's How It Works */}
        <div className="mb-6">
          <h2 className="text-3xl font-black text-white mb-4">Here's How It Works</h2>

          <div className="bg-white bg-opacity-15 backdrop-blur rounded-2xl p-6 mb-4">
            <p className="text-white text-2xl font-black mb-3">🙋 If you crew <span className="text-lg font-semibold">(no boat needed)</span></p>
            <p className="text-white text-xl font-semibold leading-relaxed">
              Browse upcoming sailings → Find one that fits your schedule → Request to join → Skipper approves → You're in! Chat with your crew before you go, share photos after.
            </p>
          </div>

          <div className="bg-white bg-opacity-15 backdrop-blur rounded-2xl p-6">
            <p className="text-white text-2xl font-black mb-3">🚢 If you own a boat</p>
            <p className="text-white text-xl font-semibold leading-relaxed">
              Post your upcoming outing → Crew members request to join → You pick who comes → Manage everything from your dashboard.
            </p>
          </div>
        </div>

        {/* What You Can Do Right Now */}
        <div className="mb-6">
          <h2 className="text-3xl font-black text-white mb-4">What You Can Do Right Now</h2>
          <div className="space-y-3">
            {[
              { emoji: '🧭', title: 'Browse Outings', desc: 'See all upcoming sails. Tap any one to learn more.' },
              { emoji: '⛵', title: 'Request to Join', desc: 'Found one you like? Ask the skipper if you can crew.' },
              { emoji: '👥', title: 'See Your Crew', desc: 'Once approved, chat and share photos with your crew.' },
              { emoji: '📋', title: 'Manage Your Boat', desc: 'Owners can post outings and approve crew from the "My Outings" tab.' },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="bg-white bg-opacity-15 backdrop-blur rounded-xl p-4 flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{emoji}</span>
                <div>
                  <p className="text-white text-xl font-black">{title}</p>
                  <p className="text-white text-lg font-semibold">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Getting Started */}
        <div className="mb-8">
          <h2 className="text-3xl font-black text-white mb-4">Getting Started</h2>
          <div className="space-y-3">
            {[
              { emoji: '1️⃣', text: 'Complete your profile — Add a photo and tell us about your sailing experience.' },
              { emoji: '2️⃣', text: 'Browse outings — Tap "Outings" to see what\'s sailing this week.' },
              { emoji: '3️⃣', text: 'Request to join — Found something fun? Request it. Skippers respond fast.' },
              { emoji: '4️⃣', text: 'Show up and sail — That\'s it. Enjoy the water.' },
            ].map(({ emoji, text }) => (
              <div key={emoji} className="bg-white bg-opacity-15 backdrop-blur rounded-xl p-4 flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{emoji}</span>
                <p className="text-white text-lg font-semibold">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sign In Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-4xl font-black text-center mb-8 text-blue-900">Sign In</h2>

          {error && (
            <div className="bg-red-100 border-2 border-red-400 text-red-800 text-xl px-5 py-4 rounded-xl mb-6 font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-2xl font-black text-blue-900 mb-3">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
                className="w-full px-5 py-4 border-3 border-blue-300 rounded-xl text-blue-900 text-2xl font-semibold placeholder-blue-500 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-2xl font-black text-blue-900 mb-3">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Your password"
                className="w-full px-5 py-4 border-3 border-blue-300 rounded-xl text-blue-900 text-2xl font-semibold placeholder-blue-500 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 rounded-xl font-black text-white text-2xl transition-all shadow-lg hover:shadow-xl"
              style={{background: loading ? '#9ca3af' : 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)'}}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t-3 border-gray-200">
            <p className="text-gray-700 text-xl font-bold text-center mb-4">Don't have an account?</p>
            <Link
              to="/signup"
              className="block w-full py-5 rounded-xl font-black text-blue-900 text-2xl border-3 border-blue-900 text-center hover:bg-blue-50 transition-all"
            >
              Sign Up
            </Link>
          </div>
        </div>

        <p className="text-white text-center text-lg font-semibold mt-8 drop-shadow">Coconut Grove Sailing Club • Miami, FL</p>
      </div>
    </div>
  );
}
