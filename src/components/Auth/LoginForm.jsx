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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-500 px-4 py-8">
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full justify-center">

        {/* Logo + Title */}
        <div className="text-center mb-10">
          <img src="/Sailing/Club Logo.jpg" alt="CGSC Logo" className="h-32 w-auto mx-auto mb-5 drop-shadow-2xl" />
          <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-lg">CGSC Sailing</h1>
          <p className="text-blue-100 text-2xl mt-2 font-bold">Coconut Grove Sailing Club</p>
        </div>

        {/* What is this */}
        <div className="mb-8 bg-white bg-opacity-15 backdrop-blur rounded-2xl p-6">
          <p className="text-white text-3xl font-black mb-3">Ready to sail? 🌊</p>
          <p className="text-white text-xl font-semibold leading-relaxed">
            Connect with sailors at CGSC. Find outings to crew, or post your own.
          </p>
        </div>

        {/* How it works */}
        <div className="space-y-4 mb-10">
          {[
            { emoji: '🙋', text: 'Browse → Request → Approved → Sail' },
            { emoji: '🚢', text: 'Own a boat? Post & pick your crew' },
            { emoji: '💬', text: 'Chat, share photos, build community' },
          ].map(({ emoji, text }) => (
            <div key={emoji} className="bg-white bg-opacity-20 backdrop-blur rounded-xl px-5 py-4 flex items-start gap-4">
              <span className="text-3xl flex-shrink-0">{emoji}</span>
              <p className="text-white text-xl font-bold">{text}</p>
            </div>
          ))}
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
            <p className="text-gray-700 text-xl font-bold text-center mb-4">New here?</p>
            <Link
              to="/signup"
              className="block w-full py-5 rounded-xl font-black text-blue-900 text-2xl border-3 border-blue-900 text-center hover:bg-blue-50 transition-all"
            >
              Create Account →
            </Link>
          </div>
        </div>

        <p className="text-white text-center text-lg font-semibold mt-8 drop-shadow">Coconut Grove Sailing Club • Miami, FL</p>
      </div>
    </div>
  );
}
