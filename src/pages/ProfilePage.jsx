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
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [boats, setBoats] = useState([]);
  const [editingBoatId, setEditingBoatId] = useState(null);
  const [boatFormData, setBoatFormData] = useState({
    name: '',
    brand: '',
    model: '',
    size_ft: '',
    capacity: '',
    mooring_location: '',
  });
  const [boatSaving, setBoatSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        sailing_experience: profile.sailing_experience || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    const fetchBoats = async () => {
      console.log('Boats fetch check - user:', user?.id, 'profile:', profile, 'user_type:', profile?.user_type);
      if (!user || profile?.user_type !== 'owner') {
        console.log('Skipping boats fetch - user exists:', !!user, 'is owner:', profile?.user_type === 'owner');
        return;
      }
      try {
        console.log('Fetching boats for owner:', user.id);
        const { data } = await supabase
          .from('boats')
          .select('*')
          .eq('owner_id', user.id);
        console.log('Boats data:', data);
        setBoats(data || []);
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
      setMessage('Profile updated successfully!');
      setEditMode(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error updating profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditBoat = (boat) => {
    setEditingBoatId(boat.id);
    setBoatFormData({
      name: boat.name || '',
      brand: boat.brand || '',
      model: boat.model || '',
      size_ft: boat.size_ft || '',
      capacity: boat.capacity || '',
      mooring_location: boat.mooring_location || '',
    });
  };

  const handleBoatChange = (e) => {
    const { name, value } = e.target;
    setBoatFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveBoat = async (boatId) => {
    try {
      setBoatSaving(true);
      const { error } = await supabase
        .from('boats')
        .update({
          name: boatFormData.name,
          brand: boatFormData.brand || null,
          model: boatFormData.model || null,
          size_ft: boatFormData.size_ft ? parseInt(boatFormData.size_ft) : null,
          capacity: parseInt(boatFormData.capacity) || 1,
          mooring_location: boatFormData.mooring_location || null,
        })
        .eq('id', boatId);

      if (error) throw error;

      setBoats((prev) =>
        prev.map((b) =>
          b.id === boatId
            ? {
                ...b,
                ...boatFormData,
                size_ft: boatFormData.size_ft ? parseInt(boatFormData.size_ft) : null,
                capacity: parseInt(boatFormData.capacity) || 1,
              }
            : b
        )
      );

      setEditingBoatId(null);
      setMessage('Boat updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error updating boat: ' + err.message);
    } finally {
      setBoatSaving(false);
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

        {/* Photo Section */}
        <div className="mb-8 text-center">
          <div className="inline-block mb-4">
            {profile?.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.full_name}
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-4xl border-4 border-gray-200">
                📷
              </div>
            )}
          </div>
          <label className="block">
            <span className="inline-block px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium cursor-pointer transition">
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

            {profile?.user_type === 'owner' && (
              <div>
                <p className="text-gray-600">Your Boats</p>
                {boats.length === 0 ? (
                  <p className="text-lg text-gray-500">No boats added yet</p>
                ) : (
                  <div className="space-y-3 mt-2">
                    {boats.map((boat) => (
                      <div key={boat.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        {editingBoatId === boat.id ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Boat Name</label>
                              <input
                                type="text"
                                name="name"
                                value={boatFormData.name}
                                onChange={handleBoatChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                                <input
                                  type="text"
                                  name="brand"
                                  value={boatFormData.brand}
                                  onChange={handleBoatChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                                <input
                                  type="text"
                                  name="model"
                                  value={boatFormData.model}
                                  onChange={handleBoatChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Size (ft)</label>
                                <input
                                  type="number"
                                  name="size_ft"
                                  value={boatFormData.size_ft}
                                  onChange={handleBoatChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                                <input
                                  type="number"
                                  name="capacity"
                                  value={boatFormData.capacity}
                                  onChange={handleBoatChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Mooring Location</label>
                              <input
                                type="text"
                                name="mooring_location"
                                value={boatFormData.mooring_location}
                                onChange={handleBoatChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveBoat(boat.id)}
                                disabled={boatSaving}
                                className="flex-1 text-white py-2 rounded-lg font-medium transition disabled:opacity-50"
                                style={{background: boatSaving ? '#9ca3af' : '#06b6d4'}}
                              >
                                {boatSaving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingBoatId(null)}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-2 rounded-lg font-medium transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold text-gray-900 text-lg">{boat.name}</p>
                            <p className="text-sm text-gray-600">{boat.brand} {boat.model}</p>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-700">
                              <div>Size: {boat.size_ft}ft</div>
                              <div>Capacity: {boat.capacity} people</div>
                              {boat.mooring_location && (
                                <div className="col-span-2">Location: {boat.mooring_location}</div>
                              )}
                            </div>
                            <button
                              onClick={() => handleEditBoat(boat)}
                              className="mt-3 text-white px-4 py-2 rounded-lg font-medium text-sm transition hover:opacity-90"
                              style={{background: '#06b6d4'}}
                            >
                              Edit Boat
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setEditMode(true)}
              className="mt-6 text-white px-6 py-2 rounded-lg font-medium transition hover:opacity-90"
              style={{background: '#06b6d4'}}
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
                className="flex-1 text-white py-2 rounded-lg font-medium transition disabled:opacity-50"
                style={{background: saving ? '#9ca3af' : '#06b6d4'}}
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
