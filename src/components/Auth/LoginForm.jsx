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

  const inputClass = "w-full px-5 py-4 rounded-xl text-white text-2xl font-semibold placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 border-2 border-blue-300 bg-white bg-opacity-20";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-600 px-5 py-8">
      <div className="max-w-2xl mx-auto w-full">

        {/* Logo + Title */}
        <div className="text-center mb-10">
          <img src="/Sailing/Club Logo.jpg" alt="CGSC Logo" className="h-28 w-auto mx-auto mb-5 drop-shadow-2xl" />
          <h1 className="text-5xl font-black text-white drop-shadow-lg mb-2">Welcome to CGSC</h1>
          <p className="text-cyan-200 text-3xl font-black">Where Sailors Meet Adventures</p>
        </div>

        {/* Ready to sail */}
        <div className="mb-8">
          <p className="text-white text-3xl font-black mb-3">Ready to sail? 🌊</p>
          <p className="text-blue-100 text-xl font-semibold leading-relaxed">
            You're part of a community of sailors at Coconut Grove Sailing Club. Whether you own a boat or love crewing, this app connects you with people and outings.
          </p>
        </div>

        {/* How It Works */}
        <div className="mb-8">
          <h2 className="text-3xl font-black text-white mb-5">Here's How It Works</h2>

          <div className="bg-white bg-opacity-10 rounded-2xl p-6 mb-4 border border-white border-opacity-20">
            <p className="text-cyan-200 text-2xl font-black mb-3">🙋 If you crew <span className="text-blue-100 text-lg font-semibold">(no boat needed)</span></p>
            <p className="text-white text-xl font-semibold leading-relaxed">
              Browse upcoming sailings → Find one that fits your schedule → Request to join → Skipper approves → You're in! Chat with your crew before you go, share photos after.
            </p>
          </div>

          <div className="bg-white bg-opacity-10 rounded-2xl p-6 border border-white border-opacity-20">
            <p className="text-cyan-200 text-2xl font-black mb-3">🚢 If you own a boat</p>
            <p className="text-white text-xl font-semibold leading-relaxed">
              Post your upcoming outing → Crew members request to join → You pick who comes → Manage everything from your dashboard.
            </p>
          </div>
        </div>

        {/* What You Can Do */}
        <div className="mb-8">
          <h2 className="text-3xl font-black text-white mb-5">What You Can Do Right Now</h2>
          <div className="space-y-3">
            {[
              { emoji: '🧭', title: 'Browse Outings', desc: 'See all upcoming sails. Tap any one to learn more.' },
              { emoji: '⛵', title: 'Request to Join', desc: 'Found one you like? Ask the skipper if you can crew.' },
              { emoji: '👥', title: 'See Your Crew', desc: 'Once approved, chat and share photos with your crew.' },
              { emoji: '📋', title: 'Manage Your Boat', desc: 'Owners can post outings and approve crew from the "My Outings" tab.' },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="flex items-start gap-4 bg-white bg-opacity-10 rounded-xl p-4 border border-white border-opacity-20">
                <span className="text-3xl flex-shrink-0">{emoji}</span>
                <div>
                  <p className="text-white text-2xl font-black">{title}</p>
                  <p className="text-blue-100 text-lg font-semibold">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Getting Started */}
        <div className="mb-10">
          <h2 className="text-3xl font-black text-white mb-5">Getting Started</h2>
          <div className="space-y-3">
            {[
              { n: '1️⃣', text: 'Complete your profile — Add a photo and tell us about your sailing experience.' },
              { n: '2️⃣', text: 'Browse outings — Tap "Outings" to see what\'s sailing this week.' },
              { n: '3️⃣', text: 'Request to join — Found something fun? Request it. Skippers respond fast.' },
              { n: '4️⃣', text: 'Show up and sail — That\'s it. Enjoy the water.' },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-start gap-4 bg-white bg-opacity-10 rounded-xl p-4 border border-white border-opacity-20">
                <span className="text-2xl flex-shrink-0">{n}</span>
                <p className="text-white text-xl font-semibold leading-snug">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sign In Form — dark themed */}
        <div className="mb-6">
          <h2 className="text-4xl font-black text-white text-center mb-8">Sign In</h2>

          {error && (
            <div className="bg-red-500 bg-opacity-80 text-white text-xl px-5 py-4 rounded-xl mb-6 font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-2xl font-black text-white mb-3">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-2xl font-black text-white mb-3">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Your password"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 rounded-xl font-black text-blue-900 text-2xl bg-cyan-300 hover:bg-cyan-200 transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Sign Up CTA */}
        <div className="text-center pb-10">
          <p className="text-blue-100 text-xl font-bold mb-4">Don't have an account?</p>
          <Link
            to="/signup"
            className="block w-full py-5 rounded-xl font-black text-blue-900 text-2xl bg-white hover:bg-blue-50 transition-all shadow-lg text-center"
          >
            Create Account →
          </Link>
        </div>

      </div>
    </div>
  );
}
