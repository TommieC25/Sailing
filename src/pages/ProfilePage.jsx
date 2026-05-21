import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    sailing_experience: '',
    phone: '',
  });
  const [boatData, setBoatData] = useState({
    name: '',
    brand_model_color: '',
    size_ft: '',
    capacity: '',
    mooring_location: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [boats, setBoats] = useState([]);
  const [boatId, setBoatId] = useState(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        sailing_experience: profile.sailing_experience || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    const fetchBoats = async () => {
      if (!user || profile?.user_type !== 'owner') {
        return;
      }
      try {
        const { data } = await supabase
          .from('boats')
          .select('*')
          .eq('owner_id', user.id);
        if (data && data.length > 0) {
          setBoatId(data[0].id);
          const brandModelColor = [data[0].brand, data[0].model, data[0].color]
            .filter(Boolean)
            .join(' / ') || '';
          setBoatData({
            name: data[0].name || '',
            brand_model_color: brandModelColor,
            size_ft: data[0].size_ft || '',
            capacity: data[0].capacity || '',
            mooring_location: data[0].mooring_location || '',
          });
          setBoats(data);
        }
      } catch (err) {
        console.error('Error fetching boats:', err);
      }
    };
    fetchBoats();
  }, [user, profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBoatChange = (e) => {
    const { name, value } = e.target;
    setBoatData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setMessage('');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('profiles').getPublicUrl(filePath);
      const photoUrl = data.publicUrl;

      await updateProfile({ photo_url: photoUrl });
      setMessage('Photo updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error uploading photo: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateProfile(formData);

      if (profile?.user_type === 'owner' && boatId) {
        const parts = boatData.brand_model_color.split('/').map(s => s.trim());
        await supabase
          .from('boats')
          .update({
            name: boatData.name,
            brand: parts[0] || null,
            model: parts[1] || null,
            color: parts[2] || null,
            size_ft: boatData.size_ft ? parseInt(boatData.size_ft) : null,
            capacity: parseInt(boatData.capacity) || 1,
            mooring_location: boatData.mooring_location || null,
          })
          .eq('id', boatId);
      }

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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Profile</h1>

        {message && (
          <div className={`mb-6 p-4 rounded text-xl ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        {/* Photo Section */}
        <div className="mb-8 text-center">
          <div className="inline-block mb-4">
            {profile?.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.full_name}
                className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-3xl border-4 border-gray-200">
                📷
              </div>
            )}
          </div>
          <label className="block">
            <span className="inline-block px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold cursor-pointer transition text-lg">
              {uploading ? 'Uploading...' : 'Change Photo'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        <div className="mb-8 space-y-2">
          <div>
            <p className="text-lg font-bold text-gray-700">Email</p>
            <p className="text-2xl font-semibold text-gray-900">{user.email}</p>
          </div>
          {profile?.phone && (
            <div>
              <p className="text-lg font-bold text-gray-700">Phone</p>
              <p className="text-2xl font-semibold text-gray-900">{profile.phone}</p>
            </div>
          )}
        </div>

        {!editMode ? (
          <div className="space-y-6">
            <div>
              <p className="text-lg text-gray-600 mb-1">Full Name</p>
              <p className="text-2xl font-semibold text-gray-900">{profile?.full_name || 'Not set'}</p>
            </div>

            <div>
              <p className="text-lg text-gray-600 mb-1">Bio</p>
              <p className="text-xl text-gray-900">{profile?.bio || 'No bio added'}</p>
            </div>

            <div>
              <p className="text-lg text-gray-600 mb-1">Sailing Experience</p>
              <p className="text-2xl font-semibold text-gray-900 capitalize">
                {profile?.sailing_experience || 'Not set'}
              </p>
            </div>

            <div>
              <p className="text-lg text-gray-600 mb-1">Account Type</p>
              <p className="text-2xl font-semibold text-gray-900 capitalize">
                {profile?.user_type || 'Not set'}
              </p>
            </div>

            {profile?.user_type === 'owner' && boats.length > 0 && (
              <div>
                <p className="text-lg text-gray-600 mb-2">Your Boat</p>
                {boats.map((boat) => (
                  <div key={boat.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="font-bold text-gray-900 text-2xl">{boat.name}</p>
                    <p className="text-lg text-gray-600 mt-1">
                      {[boat.brand, boat.model, boat.color].filter(Boolean).join(' / ')}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-lg text-gray-700">
                      <div>Size: {boat.size_ft}ft</div>
                      <div>Capacity: {boat.capacity}</div>
                      {boat.mooring_location && (
                        <div className="col-span-2">Location: {boat.mooring_location}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setEditMode(true)}
              className="mt-8 text-white px-8 py-4 rounded-lg font-bold transition hover:opacity-90 text-xl"
              style={{background: '#06b6d4'}}
            >
              Edit Profile
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Profile Information</h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-xl font-bold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-2xl border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xl font-bold text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-4 py-3 text-2xl border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Tell other sailors about yourself..."
                  />
                </div>

                <div>
                  <label className="block text-xl font-bold text-gray-700 mb-2">
                    Sailing Experience
                  </label>
                  <select
                    name="sailing_experience"
                    value={formData.sailing_experience}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-2xl border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xl font-bold text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-2xl border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {profile?.user_type === 'owner' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Boat Information</h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xl font-bold text-gray-700 mb-2">
                      Boat Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={boatData.name}
                      onChange={handleBoatChange}
                      className="w-full px-4 py-3 text-2xl border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xl font-bold text-gray-700 mb-2">
                      Brand / Model / Color
                    </label>
                    <input
                      type="text"
                      name="brand_model_color"
                      value={boatData.brand_model_color}
                      onChange={handleBoatChange}
                      placeholder="e.g., Tartan 33, blue"
                      className="w-full px-4 py-3 text-2xl border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xl font-bold text-gray-700 mb-2">
                        Size (ft)
                      </label>
                      <input
                        type="number"
                        name="size_ft"
                        value={boatData.size_ft}
                        onChange={handleBoatChange}
                        className="w-full px-4 py-3 text-2xl border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xl font-bold text-gray-700 mb-2">
                        Capacity
                      </label>
                      <input
                        type="number"
                        name="capacity"
                        value={boatData.capacity}
                        onChange={handleBoatChange}
                        className="w-full px-4 py-3 text-2xl border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xl font-bold text-gray-700 mb-2">
                      Location (Club Mooring / Marina & Slip)
                    </label>
                    <input
                      type="text"
                      name="mooring_location"
                      value={boatData.mooring_location}
                      onChange={handleBoatChange}
                      className="w-full px-4 py-3 text-2xl border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 text-white py-4 rounded-lg font-bold transition disabled:opacity-50 text-xl"
                style={{background: saving ? '#9ca3af' : '#06b6d4'}}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-4 rounded-lg font-bold transition text-xl"
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
