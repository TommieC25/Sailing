import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    sailing_experience: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        sailing_experience: profile.sailing_experience || '',
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateProfile(formData);
      setMessage('Profile updated successfully!');
      setEditMode(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error updating profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Profile</h1>

        {message && (
          <div className={`mb-4 p-4 rounded ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <div className="mb-6">
          <p className="text-gray-600">Email: <span className="font-semibold text-gray-900">{user.email}</span></p>
        </div>

        {!editMode ? (
          <div className="space-y-4">
            <div>
              <p className="text-gray-600">Full Name</p>
              <p className="text-lg font-semibold text-gray-900">{profile?.full_name || 'Not set'}</p>
            </div>

            <div>
              <p className="text-gray-600">Bio</p>
              <p className="text-lg text-gray-900">{profile?.bio || 'No bio added'}</p>
            </div>

            <div>
              <p className="text-gray-600">Sailing Experience</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {profile?.sailing_experience || 'Not set'}
              </p>
            </div>

            <div>
              <p className="text-gray-600">Account Type</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {profile?.user_type || 'Not set'}
              </p>
            </div>

            <button
              onClick={() => setEditMode(true)}
              className="mt-6 bg-ocean-600 hover:bg-ocean-700 text-white px-6 py-2 rounded-lg font-medium transition"
            >
              Edit Profile
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                placeholder="Tell other sailors about yourself..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sailing Experience
              </label>
              <select
                name="sailing_experience"
                value={formData.sailing_experience}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-ocean-600 hover:bg-ocean-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-2 rounded-lg font-medium transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
