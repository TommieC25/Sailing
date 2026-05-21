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

  const inputClass = "w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-gray-900 text-xl focus:outline-none focus:border-blue-500";
  const labelClass = "block text-xl font-bold mb-2";
  const labelStyle = {color: '#0c2340'};

  return (
    <div className="min-h-screen flex flex-col" style={{background: 'linear-gradient(160deg, #0c2340 0%, #0369a1 60%, #0ea5e9 100%)'}}>
      <div className="flex-1 flex flex-col px-6 py-10 max-w-lg mx-auto w-full">

        {/* Logo */}
        <div className="text-center mb-7">
          <img src="/Sailing/Club Logo.jpg" alt="CGSC Logo" className="h-24 w-auto mx-auto mb-3 drop-shadow-lg" />
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Join CGSC Sailing</h1>
          <p className="text-blue-100 text-lg mt-1">Coconut Grove Sailing Club</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <h2 className="text-3xl font-extrabold mb-6 text-center" style={{color: '#0c2340'}}>Create Account</h2>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 text-lg px-4 py-3 rounded-xl mb-5">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={labelClass} style={labelStyle}>Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required placeholder="Your full name" className={inputClass} />
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="your@email.com" className={inputClass} />
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="Min 6 characters" className={inputClass} />
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>Confirm Password</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="Same password again" className={inputClass} />
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>I am a...</label>
              <select name="userType" value={formData.userType} onChange={handleChange} className={inputClass + " bg-white"}>
                <option value="crew">Crew Member (looking for boats)</option>
                <option value="owner">Boat Owner / Skipper</option>
              </select>
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>Sailing Experience</label>
              <select name="sailingExperience" value={formData.sailingExperience} onChange={handleChange} className={inputClass + " bg-white"}>
                <option value="beginner">Beginner — still learning</option>
                <option value="intermediate">Intermediate — been out a few times</option>
                <option value="advanced">Advanced — I know my way around a boat</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-extrabold text-white text-xl transition-all mt-2"
              style={{background: loading ? '#9ca3af' : 'linear-gradient(135deg, #0c2340, #0369a1)'}}
            >
              {loading ? 'Creating Account...' : 'Create My Account →'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t-2 border-gray-100 text-center">
            <p className="text-gray-500 text-lg mb-3">Already have an account?</p>
            <Link to="/login" className="block w-full py-4 rounded-xl font-extrabold text-xl border-2 transition-all" style={{color: '#0c2340', borderColor: '#0c2340'}}>
              Sign In →
            </Link>
          </div>
        </div>

        <p className="text-blue-200 text-center text-base mt-6">Coconut Grove Sailing Club · Miami, FL</p>
      </div>
    </div>
  );
}
