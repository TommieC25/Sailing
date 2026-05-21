import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

const styles = {
  container: { maxWidth: '800px', margin: '0 auto' },
  card: { background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '1.5rem' },
  title: { fontSize: '2rem', fontWeight: 'bold', color: '#111', marginBottom: '2rem' },
  photo: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #ddd' },
  photoSection: { marginBottom: '2rem', textAlign: 'center' },
  photoPlaceholder: { width: '80px', height: '80px', borderRadius: '50%', background: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: '4px solid #ddd' },
  button: { background: '#06b6d4', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' },
  label: { fontSize: '1.125rem', fontWeight: 'bold', color: '#555', marginBottom: '0.5rem', display: 'block' },
  value: { fontSize: '1.5rem', fontWeight: '600', color: '#111', marginBottom: '1.5rem' },
  input: { width: '100%', padding: '0.75rem', fontSize: '1.5rem', border: '1px solid #ccc', borderRadius: '6px', fontFamily: 'inherit', marginBottom: '1.5rem' },
  select: { width: '100%', padding: '0.75rem', fontSize: '1.5rem', border: '1px solid #ccc', borderRadius: '6px', fontFamily: 'inherit', marginBottom: '1.5rem' },
  textarea: { width: '100%', padding: '0.75rem', fontSize: '1.5rem', border: '1px solid #ccc', borderRadius: '6px', fontFamily: 'inherit', marginBottom: '1.5rem', minHeight: '100px' },
  section: { marginBottom: '2rem' },
  sectionTitle: { fontSize: '1.5rem', fontWeight: 'bold', color: '#111', marginBottom: '1.5rem' },
  boat: { background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' },
  topContact: { display: 'flex', gap: '2rem', marginBottom: '2rem' },
  contactCol: { flex: 1 },
};

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
    return <div style={{textAlign: 'center', paddingTop: '3rem'}}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>My Profile</h1>

        {message && (
          <div style={{marginBottom: '1.5rem', padding: '1rem', borderRadius: '6px', fontSize: '1.1rem', background: message.includes('Error') ? '#fee' : '#efe', color: message.includes('Error') ? '#c00' : '#060'}}>
            {message}
          </div>
        )}

        <div style={styles.photoSection}>
          <div style={{marginBottom: '1rem', display: 'inline-block'}}>
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt={profile.full_name} style={styles.photo} />
            ) : (
              <div style={styles.photoPlaceholder}>📷</div>
            )}
          </div>
          <label>
            <span style={{...styles.button, display: 'inline-block', cursor: 'pointer'}}>
              {uploading ? 'Uploading...' : 'Change Photo'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              style={{display: 'none'}}
            />
          </label>
        </div>

        {!editMode ? (
          <>
            <div style={styles.topContact}>
              <div style={styles.contactCol}>
                <div style={styles.label}>Email</div>
                <div style={styles.value}>{user.email}</div>
              </div>
              {profile?.phone && (
                <div style={styles.contactCol}>
                  <div style={styles.label}>Phone</div>
                  <div style={styles.value}>{profile.phone}</div>
                </div>
              )}
            </div>

            <div style={styles.section}>
              <div style={styles.label}>Full Name</div>
              <div style={styles.value}>{profile?.full_name || 'Not set'}</div>
            </div>

            <div style={styles.section}>
              <div style={styles.label}>Bio</div>
              <div style={styles.value}>{profile?.bio || 'No bio added'}</div>
            </div>

            <div style={styles.section}>
              <div style={styles.label}>Sailing Experience</div>
              <div style={styles.value}>{profile?.sailing_experience || 'Not set'}</div>
            </div>

            <div style={styles.section}>
              <div style={styles.label}>Account Type</div>
              <div style={styles.value}>{profile?.user_type || 'Not set'}</div>
            </div>

            {profile?.user_type === 'owner' && boats.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Your Boat</div>
                {boats.map((boat) => (
                  <div key={boat.id} style={styles.boat}>
                    <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#111', marginBottom: '0.5rem'}}>{boat.name}</div>
                    <div style={{fontSize: '1rem', color: '#666', marginBottom: '1rem'}}>{[boat.brand, boat.model, boat.color].filter(Boolean).join(' / ')}</div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '1rem', color: '#333'}}>
                      <div>Size: {boat.size_ft}ft</div>
                      <div>Capacity: {boat.capacity}</div>
                      {boat.mooring_location && (
                        <div style={{gridColumn: '1/-1'}}>Location: {boat.mooring_location}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setEditMode(true)} style={{...styles.button, marginTop: '2rem', fontSize: '1.1rem', padding: '1rem 2rem'}}>
              Edit Profile
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={styles.section}>
              <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#111', marginBottom: '1.5rem'}}>Profile Information</div>

              <div>
                <div style={styles.label}>Full Name</div>
                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} style={styles.input} />
              </div>

              <div>
                <div style={styles.label}>Bio</div>
                <textarea name="bio" value={formData.bio} onChange={handleChange} style={styles.textarea} placeholder="Tell other sailors about yourself..." />
              </div>

              <div>
                <div style={styles.label}>Sailing Experience</div>
                <select name="sailing_experience" value={formData.sailing_experience} onChange={handleChange} style={styles.select}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <div style={styles.label}>Phone</div>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} style={styles.input} />
              </div>
            </div>

            {profile?.user_type === 'owner' && (
              <div style={styles.section}>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#111', marginBottom: '1.5rem'}}>Boat Information</div>

                <div>
                  <div style={styles.label}>Boat Name</div>
                  <input type="text" name="name" value={boatData.name} onChange={handleBoatChange} style={styles.input} />
                </div>

                <div>
                  <div style={styles.label}>Brand / Model / Color</div>
                  <input type="text" name="brand_model_color" value={boatData.brand_model_color} onChange={handleBoatChange} style={styles.input} placeholder="e.g., Tartan 33, blue" />
                </div>

                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div>
                    <div style={styles.label}>Size (ft)</div>
                    <input type="number" name="size_ft" value={boatData.size_ft} onChange={handleBoatChange} style={{...styles.input, marginBottom: 0}} />
                  </div>

                  <div>
                    <div style={styles.label}>Capacity</div>
                    <input type="number" name="capacity" value={boatData.capacity} onChange={handleBoatChange} style={{...styles.input, marginBottom: 0}} />
                  </div>
                </div>

                <div style={{marginTop: '1.5rem'}}>
                  <div style={styles.label}>Location (Club Mooring / Marina & Slip)</div>
                  <input type="text" name="mooring_location" value={boatData.mooring_location} onChange={handleBoatChange} style={styles.input} />
                </div>
              </div>
            )}

            <div style={{display: 'flex', gap: '1rem', marginTop: '2rem'}}>
              <button type="submit" disabled={saving} style={{...styles.button, flex: 1, fontSize: '1.1rem', padding: '1rem', opacity: saving ? 0.6 : 1}}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setEditMode(false)} style={{flex: 1, fontSize: '1.1rem', padding: '1rem', background: '#ddd', color: '#333', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'}}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
