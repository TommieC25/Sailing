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
    <div className="min-h-screen flex flex-col" style={{background: 'linear-gradient(160deg, #0c2340 0%, #0369a1 60%, #0ea5e9 100%)'}}>
      <div className="flex-1 flex flex-col px-6 py-10 max-w-lg mx-auto w-full">

        {/* Logo + Title */}
        <div className="text-center mb-8">
          <img src="/Sailing/Club Logo.jpg" alt="CGSC Logo" className="h-28 w-auto mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow">CGSC Sailing</h1>
          <p className="text-blue-100 text-xl mt-1 font-medium">Coconut Grove Sailing Club</p>
        </div>

        {/* What is this */}
        <div className="mb-6">
          <p className="text-white text-2xl font-bold mb-2">Ready to sail? 🌊</p>
          <p className="text-blue-100 text-lg leading-relaxed">
            Connect with sailors at CGSC. Find outings to crew, or post your own as a skipper.
          </p>
        </div>

        {/* How it works */}
        <div className="space-y-3 mb-8">
          {[
            { emoji: '🙋', text: 'Browse sailings → Request a spot → Skipper approves → You\'re in' },
            { emoji: '🚢', text: 'Own a boat? Post an outing and pick your crew' },
            { emoji: '💬', text: 'Chat, share photos, and build your sailing community' },
          ].map(({ emoji, text }) => (
            <div key={emoji} className="flex items-start gap-3 bg-white bg-opacity-10 rounded-xl px-4 py-3">
              <span className="text-2xl flex-shrink-0">{emoji}</span>
              <p className="text-white text-lg font-medium leading-snug">{text}</p>
            </div>
          ))}
        </div>

        {/* Sign In Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <h2 className="text-3xl font-extrabold mb-6 text-center" style={{color: '#0c2340'}}>⚓ Sign In</h2>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 text-lg px-4 py-3 rounded-xl mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xl font-bold mb-2" style={{color: '#0c2340'}}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-gray-900 text-xl focus:outline-none focus:border-blue-500"
                style={{'--tw-placeholder-color': '#6b7280', fontSize: '1.25rem'}}
              />
            </div>

            <div>
              <label className="block text-xl font-bold mb-2" style={{color: '#0c2340'}}>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Your password"
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-gray-900 text-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-extrabold text-white text-xl transition-all mt-2"
              style={{background: loading ? '#9ca3af' : 'linear-gradient(135deg, #0c2340, #0369a1)'}}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t-2 border-gray-100 text-center">
            <p className="text-gray-500 text-lg mb-3">New to CGSC Sailing?</p>
            <Link
              to="/signup"
              className="block w-full py-4 rounded-xl font-extrabold text-xl border-2 transition-all"
              style={{color: '#0c2340', borderColor: '#0c2340'}}
            >
              Create Your Account →
            </Link>
          </div>
        </div>

        <p className="text-blue-200 text-center text-base mt-6">Coconut Grove Sailing Club · Miami, FL</p>
      </div>
    </div>
  );
}
