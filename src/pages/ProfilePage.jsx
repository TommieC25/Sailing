import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { formatPhoneNumber, phoneDigits } from '../utils/phoneFormat';

const styles = {
  container: { maxWidth: '820px', margin: '0 auto' },
  card: { background: '#ffffff', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '14px', border: '1px solid #e5e7eb' },
  title: { fontSize: '1.45rem', fontWeight: 900, color: '#1e293b', margin: '0 0 10px 0' },
  photo: { width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #dbeafe' },
  photoSection: { marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', flexWrap: 'wrap' },
  photoPlaceholder: { width: '96px', height: '96px', borderRadius: '50%', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '3px solid #bfdbfe', flexShrink: 0 },
  button: { background: '#06b6d4', color: '#ffffff', padding: '9px 12px', borderRadius: '8px', border: 'none', fontWeight: 900, cursor: 'pointer', fontSize: '0.95rem', transition: 'all 0.2s' },
  label: { fontSize: '0.82rem', fontWeight: 800, color: '#64748b', marginBottom: '3px', display: 'block' },
  value: { fontSize: '0.98rem', fontWeight: 700, color: '#1e293b', margin: 0, lineHeight: 1.35, overflowWrap: 'anywhere' },
  input: { width: '100%', padding: '9px 10px', fontSize: '0.95rem', border: '1px solid #bfdbfe', borderRadius: '8px', fontFamily: 'inherit', color: '#1e293b', background: '#ffffff' },
  select: { width: '100%', padding: '9px 10px', fontSize: '0.95rem', border: '1px solid #bfdbfe', borderRadius: '8px', fontFamily: 'inherit', color: '#1e293b', background: '#ffffff' },
  textarea: { width: '100%', padding: '9px 10px', fontSize: '0.95rem', border: '1px solid #bfdbfe', borderRadius: '8px', fontFamily: 'inherit', minHeight: '78px', color: '#1e293b', background: '#ffffff', resize: 'vertical' },
  section: { marginBottom: '12px' },
  sectionTitle: { fontSize: '1.05rem', fontWeight: 900, color: '#1e293b', margin: '0 0 8px 0', paddingBottom: '6px', borderBottom: '1px solid #e0f2fe' },
  boat: { background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' },
  topContact: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px', marginBottom: '10px' },
  contactCol: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' },
  factsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', marginBottom: '10px' },
  factBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', minWidth: 0 },
  bioBox: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px 10px', marginBottom: '10px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' },
  field: { display: 'grid', gap: '4px', minWidth: 0 },
};

export default function ProfilePage() {
  const { id: profileId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    user_type: '',
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
            .from('public_profiles')
            .select('id, full_name, photo_url, gender, bio, sailing_experience, user_type')
            .eq('id', profileId)
            .maybeSingle();

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
      // Keep the edit form in sync with the loaded profile.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        full_name: profile.full_name || '',
        gender: profile.gender || '',
        bio: profile.bio || '',
        sailing_experience: profile.sailing_experience || '',
        phone: formatPhoneNumber(profile.phone_number || profile.phone || ''),
        user_type: profile.user_type || '',
      });
    }
  }, [profile, isViewingOther]);

  useEffect(() => {
    const fetchBoats = async () => {
      if (!user || profile?.user_type !== 'owner') {
        setBoatId(null);
        setBoats([]);
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
    if (name === 'phone') {
      setFormData((prev) => ({ ...prev, phone: formatPhoneNumber(value) }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBoatChange = (e) => {
    const { name, value } = e.target;
    setBoatData((prev) => ({ ...prev, [name]: value }));
  };

  const saveBoat = async () => {
    if (formData.user_type !== 'owner') {
      setBoatId(null);
      setBoats([]);
      setBoatData({
        name: '',
        brand_model_color: '',
        size_ft: '',
        capacity: '',
        mooring_location: '',
      });
      return;
    }

    if (!boatData.name.trim()) {
      throw new Error('Please enter your boat name');
    }

    const capacity = parseInt(boatData.capacity, 10);
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error('Please enter your boat capacity');
    }

    const sizeFt = boatData.size_ft ? parseInt(boatData.size_ft, 10) : null;
    if (boatData.size_ft && (!Number.isInteger(sizeFt) || sizeFt < 1)) {
      throw new Error('Please enter a valid boat size');
    }

    const parts = boatData.brand_model_color.split('/').map(s => s.trim());
    const boatPayload = {
      owner_id: user.id,
      name: boatData.name,
      brand: parts[0] || null,
      model: parts[1] || null,
      color: parts[2] || null,
      size_ft: sizeFt,
      capacity,
      mooring_location: boatData.mooring_location || null,
    };

    if (boatId) {
      const { data, error } = await supabase
        .from('boats')
        .update(boatPayload)
        .eq('id', boatId)
        .select()
        .single();

      if (error) throw error;
      setBoats([data]);
      return;
    }

    const { data, error } = await supabase
      .from('boats')
      .insert([boatPayload])
      .select()
      .single();

    if (error) throw error;
    setBoatId(data.id);
    setBoats([data]);
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
    setMessage('');

    if (!formData.full_name?.trim()) {
      setMessage('Please enter your full name');
      return;
    }

    if (!formData.gender) {
      setMessage('Please select your gender');
      return;
    }

    if (!formData.sailing_experience) {
      setMessage('Please select your sailing experience level');
      return;
    }

    if (!formData.user_type) {
      setMessage('Please select your account type');
      return;
    }

    const normalizedPhone = phoneDigits(formData.phone);
    if (normalizedPhone.length !== 10) {
      setMessage('Please enter a valid 10-digit phone number');
      return;
    }

    if (!profile?.photo_url) {
      setMessage('Please upload a profile photo');
      return;
    }

    try {
      setSaving(true);

      const updateData = {
        full_name: formData.full_name,
        gender: formData.gender,
        bio: formData.bio,
        sailing_experience: formData.sailing_experience,
        phone: formatPhoneNumber(normalizedPhone),
        phone_number: normalizedPhone,
        user_type: formData.user_type,
      };

      await updateProfile(updateData);

      await saveBoat();

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
  const returnTo = searchParams.get('returnTo');

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {isViewingOther && returnTo && (
          <button
            type="button"
            onClick={() => navigate(returnTo)}
            style={{...styles.button, background: '#0c2340', marginBottom: '10px'}}
          >
            Back to Previous
          </button>
        )}
        <h1 style={styles.title}>{isViewingOther ? displayProfile?.full_name : 'My Profile'}</h1>

        {isViewingOther && (
          <button
            type="button"
            onClick={() => navigate(`/messages/${profileId}`)}
            style={{...styles.button, width: '100%', marginBottom: '10px'}}
          >
            Message {displayProfile?.full_name || 'Member'}
          </button>
        )}

        {message && (
          <div style={{marginBottom: '10px', padding: '10px 12px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 700, background: message.includes('Error') ? '#fee2e2' : '#f0fdf4', color: message.includes('Error') ? '#991b1b' : '#166534', border: message.includes('Error') ? '1px solid #dc2626' : '1px solid #16a34a'}}>
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
          <div style={{minWidth: 0, flex: 1}}>
            <p style={{...styles.value, fontSize: '1.08rem'}}>{displayProfile?.full_name || 'Name not set'}</p>
            <p style={{fontSize: '0.88rem', color: '#64748b', fontWeight: 700, margin: '3px 0 0 0', textTransform: 'capitalize'}}>
              {[displayProfile?.user_type, displayProfile?.sailing_experience].filter(Boolean).join(' · ') || 'Profile details not set'}
            </p>
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
              {(profile?.phone_number || profile?.phone) && (
                <div style={styles.contactCol}>
                  <div style={styles.label}>Phone</div>
                  <div style={styles.value}>{formatPhoneNumber(profile.phone || profile.phone_number)}</div>
                </div>
              )}
            </div>

            <div style={styles.factsGrid}>
              <div style={styles.factBox}>
                <div style={styles.label}>Full Name</div>
                <div style={styles.value}>{profile?.full_name || 'Not set'}</div>
              </div>
              <div style={styles.factBox}>
                <div style={styles.label}>Sailing Experience</div>
                <div style={styles.value}>{profile?.sailing_experience ? profile.sailing_experience.charAt(0).toUpperCase() + profile.sailing_experience.slice(1) : 'Not set'}</div>
              </div>
              <div style={styles.factBox}>
                <div style={styles.label}>Account Type</div>
                <div style={styles.value}>{profile?.user_type ? profile.user_type.charAt(0).toUpperCase() + profile.user_type.slice(1) : 'Not set'}</div>
              </div>
            </div>

            <div style={styles.bioBox}>
              <div style={styles.label}>Bio</div>
              <div style={styles.value}>{profile?.bio || 'No bio added'}</div>
            </div>

            {profile?.user_type === 'owner' && boats.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Your Boat</div>
                {boats.map((boat) => (
                  <div key={boat.id} style={styles.boat}>
                    <div style={{fontSize: '1rem', fontWeight: 900, color: '#0c2340', marginBottom: '4px'}}>{boat.name}</div>
                    <div style={{fontSize: '0.9rem', color: '#475569', fontWeight: 700}}>
                      {[
                        [boat.brand, boat.model, boat.color].filter(Boolean).join(' / '),
                        boat.size_ft ? `${boat.size_ft}ft` : null,
                        boat.capacity ? `${boat.capacity} people` : null,
                        boat.mooring_location,
                      ].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setEditMode(true)} style={{...styles.button, marginTop: '4px'}}>
              Edit Profile
            </button>
          </>
        ) : isViewingOther ? (
          <>
            <div style={styles.factsGrid}>
              <div style={styles.factBox}>
                <div style={styles.label}>Full Name</div>
                <div style={styles.value}>{displayProfile?.full_name || 'Not set'}</div>
              </div>
              <div style={styles.factBox}>
                <div style={styles.label}>Gender</div>
                <div style={styles.value}>{displayProfile?.gender || 'Not set'}</div>
              </div>
              <div style={styles.factBox}>
                <div style={styles.label}>Sailing Experience</div>
                <div style={styles.value}>{displayProfile?.sailing_experience ? displayProfile.sailing_experience.charAt(0).toUpperCase() + displayProfile.sailing_experience.slice(1) : 'Not set'}</div>
              </div>
            </div>

            <div style={styles.bioBox}>
              <div style={styles.label}>Bio</div>
              <div style={styles.value}>{displayProfile?.bio || 'No bio added'}</div>
            </div>

            {displayProfile?.user_type === 'owner' && displayBoats.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Boat</div>
                {displayBoats.map((boat) => (
                  <div key={boat.id} style={styles.boat}>
                    <div style={{fontSize: '1rem', fontWeight: 900, color: '#0c2340', marginBottom: '4px'}}>{boat.name}</div>
                    <div style={{fontSize: '0.9rem', color: '#475569', fontWeight: 700}}>
                      {[
                        [boat.brand, boat.model, boat.color].filter(Boolean).join(' / '),
                        boat.size_ft ? `${boat.size_ft}ft` : null,
                        boat.capacity ? `${boat.capacity} people` : null,
                        boat.mooring_location,
                      ].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Profile Information</div>

              <div style={styles.formGrid}>
              <div style={styles.field}>
                <div style={styles.label}>Full Name *</div>
                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} style={styles.input} />
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Gender *</div>
                <select name="gender" value={formData.gender} onChange={handleChange} style={styles.select}>
                  <option value="">Select gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Sailing Experience *</div>
                <select name="sailing_experience" value={formData.sailing_experience} onChange={handleChange} style={styles.select}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Phone</div>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="305.555.1212" style={styles.input} />
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Account Type</div>
                <select name="user_type" value={formData.user_type} onChange={handleChange} style={styles.select}>
                  <option value="crew">Crew Member</option>
                  <option value="owner">Boat Owner / Skipper</option>
                </select>
              </div>
              </div>

              <div style={{...styles.field, marginTop: '10px'}}>
                <div style={styles.label}>Bio</div>
                <textarea name="bio" value={formData.bio} onChange={handleChange} style={styles.textarea} placeholder="Tell other sailors about yourself..." />
              </div>
            </div>

            {formData.user_type === 'owner' && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Boat Information</div>

                <div style={styles.formGrid}>
                <div style={styles.field}>
                  <div style={styles.label}>Boat Name</div>
                  <input type="text" name="name" value={boatData.name} onChange={handleBoatChange} style={styles.input} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Brand / Model / Color</div>
                  <input type="text" name="brand_model_color" value={boatData.brand_model_color} onChange={handleBoatChange} style={styles.input} placeholder="e.g., Tartan / 33 / blue" />
                </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Size (ft)</div>
                    <input type="number" name="size_ft" value={boatData.size_ft} onChange={handleBoatChange} style={styles.input} />
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Capacity</div>
                    <input type="number" name="capacity" value={boatData.capacity} onChange={handleBoatChange} style={styles.input} />
                  </div>

                <div style={styles.field}>
                  <div style={styles.label}>Location (Club Mooring / Marina & Slip)</div>
                  <input type="text" name="mooring_location" value={boatData.mooring_location} onChange={handleBoatChange} style={styles.input} />
                </div>
                </div>
              </div>
            )}

            <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
              <button type="submit" disabled={saving} style={{...styles.button, flex: 1, opacity: saving ? 0.6 : 1}}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setEditMode(false)} style={{...styles.button, flex: 1, background: '#e5e7eb', color: '#1e293b'}}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
