import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

const styles = {
  container: { maxWidth: '800px', margin: '0 auto' },
  card: { background: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '32px', border: '1px solid #e5e7eb' },
  title: { fontSize: '2rem', fontWeight: 900, color: '#1e293b', marginBottom: '2rem', margin: '0 0 2rem 0' },
  photo: { width: '160px', height: '160px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #dbeafe' },
  photoSection: { marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem' },
  photoPlaceholder: { width: '160px', height: '160px', borderRadius: '50%', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', border: '4px solid #bfdbfe', flexShrink: 0 },
  button: { background: '#06b6d4', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 900, cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' },
  label: { fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'block' },
  value: { fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.5rem' },
  input: { width: '100%', padding: '12px 16px', fontSize: '1rem', border: '2px solid #dbeafe', borderRadius: '8px', fontFamily: 'inherit', marginBottom: '1.5rem', color: '#1e293b', background: '#ffffff' },
  select: { width: '100%', padding: '12px 16px', fontSize: '1rem', border: '2px solid #dbeafe', borderRadius: '8px', fontFamily: 'inherit', marginBottom: '1.5rem', color: '#1e293b', background: '#ffffff' },
  textarea: { width: '100%', padding: '12px 16px', fontSize: '1rem', border: '2px solid #dbeafe', borderRadius: '8px', fontFamily: 'inherit', marginBottom: '1.5rem', minHeight: '100px', color: '#1e293b', background: '#ffffff', resize: 'vertical' },
  section: { marginBottom: '2rem' },
  sectionTitle: { fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '1.5rem', margin: '0 0 1.5rem 0', paddingBottom: '12px', borderBottom: '2px solid #e0f2fe' },
  boat: { background: '#f0f9ff', border: '2px solid #bfdbfe', borderRadius: '8px', padding: '16px', marginBottom: '1rem' },
  topContact: { display: 'block', marginBottom: '2rem' },
  contactCol: { marginBottom: '1.5rem' },
};

export default function ProfilePage() {
  const { id: profileId } = useParams();
  const { user, profile, updateProfile } = useAuth();
  const [viewedProfile, setViewedProfile] = useState(null);
  const [viewedBoats, setViewedBoats] = useState([]);
  const [loading, setLoading] = useState(profileId ? true : false);
  const isViewingOther = !!profileId && profileId !== user?.id;
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    gender: '',
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
    if (isViewingOther) {
      const fetchViewedProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', profileId)
            .single();

          if (error) throw error;
          setViewedProfile(data);
        } catch (err) {
          console.error('Error fetching profile:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchViewedProfile();
    }
  }, [profileId, isViewingOther]);

  useEffect(() => {
    const fetchViewedBoats = async () => {
      if (!isViewingOther || !viewedProfile) return;
      try {
        const { data } = await supabase
          .from('boats')
          .select('*')
          .eq('owner_id', profileId);
        setViewedBoats(data || []);
      } catch (err) {
        console.error('Error fetching boats:', err);
      }
    };
    fetchViewedBoats();
  }, [profileId, isViewingOther, viewedProfile]);

  useEffect(() => {
    if (profile && !isViewingOther) {
      setFormData({
        full_name: profile.full_name || '',
        gender: profile.gender || '',
        bio: profile.bio || '',
        sailing_experience: profile.sailing_experience || '',
        phone: profile.phone || '',
      });
    }
  }, [profile, isViewingOther]);

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

  if (isViewingOther && loading) {
    return <div style={{textAlign: 'center', paddingTop: '3rem'}}>Loading profile...</div>;
  }

  if (isViewingOther && !viewedProfile) {
    return <div style={{textAlign: 'center', paddingTop: '3rem'}}>Profile not found</div>;
  }

  const displayProfile = isViewingOther ? viewedProfile : profile;
  const displayBoats = isViewingOther ? viewedBoats : boats;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>{isViewingOther ? displayProfile?.full_name : 'My Profile'}</h1>

        {message && (
          <div style={{marginBottom: '1.5rem', padding: '16px', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, background: message.includes('Error') ? '#fee2e2' : '#f0fdf4', color: message.includes('Error') ? '#991b1b' : '#166534', border: message.includes('Error') ? '2px solid #dc2626' : '2px solid #16a34a'}}>
            {message}
          </div>
        )}

        <div style={styles.photoSection}>
          <div>
            {displayProfile?.photo_url ? (
              <img src={displayProfile.photo_url} alt={displayProfile.full_name} style={styles.photo} />
            ) : (
              <div style={styles.photoPlaceholder}>📷</div>
            )}
          </div>
          {!isViewingOther && (
            <label>
              <span style={{...styles.button, display: 'block', cursor: 'pointer'}}>
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
          )}
        </div>

        {!editMode && !isViewingOther ? (
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
              <div style={styles.value}>{profile?.sailing_experience ? profile.sailing_experience.charAt(0).toUpperCase() + profile.sailing_experience.slice(1) : 'Not set'}</div>
            </div>

            <div style={styles.section}>
              <div style={styles.label}>Account Type</div>
              <div style={styles.value}>{profile?.user_type ? profile.user_type.charAt(0).toUpperCase() + profile.user_type.slice(1) : 'Not set'}</div>
            </div>

            {profile?.user_type === 'owner' && boats.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Your Boat</div>
                {boats.map((boat) => (
                  <div key={boat.id} style={styles.boat}>
                    <div style={{fontSize: '1.25rem', fontWeight: 900, color: '#0c2340', marginBottom: '8px'}}>{boat.name}</div>
                    <div style={{fontSize: '1rem', color: '#64748b', marginBottom: '1rem', fontWeight: 600}}>{[boat.brand, boat.model, boat.color].filter(Boolean).join(' / ')}</div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '1rem', color: '#475569'}}>
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

            <button onClick={() => setEditMode(true)} style={{...styles.button, marginTop: '2rem', fontSize: '1.125rem', padding: '12px 24px'}}>
              Edit Profile
            </button>
          </>
        ) : isViewingOther ? (
          <>
            <div style={styles.section}>
              <div style={styles.label}>Full Name</div>
              <div style={styles.value}>{displayProfile?.full_name || 'Not set'}</div>
            </div>

            <div style={styles.section}>
              <div style={styles.label}>Gender</div>
              <div style={styles.value}>{displayProfile?.gender || 'Not set'}</div>
            </div>

            <div style={styles.section}>
              <div style={styles.label}>Bio</div>
              <div style={styles.value}>{displayProfile?.bio || 'No bio added'}</div>
            </div>

            <div style={styles.section}>
              <div style={styles.label}>Sailing Experience</div>
              <div style={styles.value}>{displayProfile?.sailing_experience ? displayProfile.sailing_experience.charAt(0).toUpperCase() + displayProfile.sailing_experience.slice(1) : 'Not set'}</div>
            </div>

            {displayProfile?.user_type === 'owner' && displayBoats.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Boat</div>
                {displayBoats.map((boat) => (
                  <div key={boat.id} style={styles.boat}>
                    <div style={{fontSize: '1.25rem', fontWeight: 900, color: '#0c2340', marginBottom: '8px'}}>{boat.name}</div>
                    <div style={{fontSize: '1rem', color: '#64748b', marginBottom: '1rem', fontWeight: 600}}>{[boat.brand, boat.model, boat.color].filter(Boolean).join(' / ')}</div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '1rem', color: '#475569'}}>
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
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={styles.section}>
              <div style={{fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '1.5rem', paddingBottom: '12px', borderBottom: '2px solid #e0f2fe'}}>Profile Information</div>

              <div>
                <div style={styles.label}>Full Name</div>
                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} style={styles.input} />
              </div>

              <div>
                <div style={styles.label}>Gender</div>
                <select name="gender" value={formData.gender} onChange={handleChange} style={styles.select}>
                  <option value="">Select gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
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
                <div style={{fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '1.5rem', paddingBottom: '12px', borderBottom: '2px solid #e0f2fe'}}>Boat Information</div>

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
              <button type="submit" disabled={saving} style={{...styles.button, flex: 1, fontSize: '1.125rem', padding: '12px', opacity: saving ? 0.6 : 1}}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setEditMode(false)} style={{flex: 1, fontSize: '1.125rem', padding: '12px', background: '#e5e7eb', color: '#1e293b', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s'}}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
