import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function SignupForm() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    userType: 'crew',
    sailingExperience: 'beginner',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    try {
      setLoading(true);
      await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        user_type: formData.userType,
        sailing_experience: formData.sailingExperience,
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-500 px-4 py-8">
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full justify-center">

        {/* Logo */}
        <div className="text-center mb-10">
          <img src="/Sailing/Club Logo.jpg" alt="CGSC Logo" className="h-28 w-auto mx-auto mb-4 drop-shadow-2xl" />
          <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-lg">Join CGSC</h1>
          <p className="text-blue-100 text-2xl mt-2 font-bold">Coconut Grove Sailing Club</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-4xl font-black text-center mb-8 text-blue-900">Create Account</h2>

          {error && (
            <div className="bg-red-100 border-2 border-red-400 text-red-800 text-xl px-5 py-4 rounded-xl mb-6 font-semibold">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-2xl font-black text-blue-900 mb-3">Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required placeholder="Your full name" className="w-full px-5 py-4 border-3 border-blue-300 rounded-xl text-blue-900 text-2xl font-semibold placeholder-blue-500 focus:outline-none focus:border-blue-600" />
            </div>

            <div>
              <label className="block text-2xl font-black text-blue-900 mb-3">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="your@email.com" className="w-full px-5 py-4 border-3 border-blue-300 rounded-xl text-blue-900 text-2xl font-semibold placeholder-blue-500 focus:outline-none focus:border-blue-600" />
            </div>

            <div>
              <label className="block text-2xl font-black text-blue-900 mb-3">Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="Min 6 characters" className="w-full px-5 py-4 border-3 border-blue-300 rounded-xl text-blue-900 text-2xl font-semibold placeholder-blue-500 focus:outline-none focus:border-blue-600" />
            </div>

            <div>
              <label className="block text-2xl font-black text-blue-900 mb-3">Confirm Password</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="Type it again" className="w-full px-5 py-4 border-3 border-blue-300 rounded-xl text-blue-900 text-2xl font-semibold placeholder-blue-500 focus:outline-none focus:border-blue-600" />
            </div>

            <div>
              <label className="block text-2xl font-black text-blue-900 mb-3">I am a...</label>
              <select name="userType" value={formData.userType} onChange={handleChange} className="w-full px-5 py-4 border-3 border-blue-300 rounded-xl text-blue-900 text-2xl font-semibold bg-white focus:outline-none focus:border-blue-600">
                <option value="crew">Crew Member</option>
                <option value="owner">Boat Owner / Skipper</option>
              </select>
            </div>

            <div>
              <label className="block text-2xl font-black text-blue-900 mb-3">Experience Level</label>
              <select name="sailingExperience" value={formData.sailingExperience} onChange={handleChange} className="w-full px-5 py-4 border-3 border-blue-300 rounded-xl text-blue-900 text-2xl font-semibold bg-white focus:outline-none focus:border-blue-600">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 rounded-xl font-black text-white text-2xl transition-all shadow-lg hover:shadow-xl"
              style={{background: loading ? '#9ca3af' : 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)'}}
            >
              {loading ? 'Creating Account...' : 'Create Account →'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t-3 border-gray-200">
            <p className="text-gray-700 text-xl font-bold text-center mb-4">Already have an account?</p>
            <Link to="/login" className="block w-full py-5 rounded-xl font-black text-blue-900 text-2xl border-3 border-blue-900 text-center hover:bg-blue-50 transition-all">
              Sign In →
            </Link>
          </div>
        </div>

        <p className="text-white text-center text-lg font-semibold mt-8 drop-shadow">Coconut Grove Sailing Club • Miami, FL</p>
      </div>
    </div>
  );
}
