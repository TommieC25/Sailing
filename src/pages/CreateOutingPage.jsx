import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

const styles = {
  container: { maxWidth: '800px', margin: '0 auto' },
  backButton: { background: '#e0f2fe', border: '2px solid #0369a1', color: '#0369a1', fontWeight: 900, fontSize: '1.125rem', marginBottom: '16px', cursor: 'pointer', textDecoration: 'none', padding: '12px 16px', borderRadius: '8px', transition: 'all 0.2s' },
  header: { borderRadius: '12px', padding: '24px', marginBottom: '24px', background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)' },
  headerTitle: { fontSize: '1.875rem', fontWeight: 900, color: '#ffffff', margin: '0 0 8px 0' },
  headerSubtitle: { color: '#e0f2fe', fontSize: '1.125rem', fontWeight: 600, margin: 0 },
  errorBox: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', fontSize: '1rem', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontWeight: 600 },
  form: { display: 'grid', gap: '20px', marginBottom: '24px' },
  section: { background: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px', display: 'grid', gap: '16px' },
  sectionTitle: { fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', margin: 0, paddingBottom: '12px', borderBottom: '2px solid #e0f2fe' },
  fieldGroup: { display: 'grid', gap: '8px' },
  label: { fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'block' },
  input: { width: '100%', padding: '12px 16px', border: '2px solid #dbeafe', borderRadius: '8px', fontSize: '1rem', fontWeight: 500, color: '#1e293b', fontFamily: 'inherit', background: '#ffffff' },
  textarea: { width: '100%', padding: '12px 16px', border: '2px solid #dbeafe', borderRadius: '8px', fontSize: '1rem', fontWeight: 500, color: '#1e293b', fontFamily: 'inherit', minHeight: '100px', resize: 'vertical', background: '#ffffff' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  infoBox: { background: '#f0f9ff', border: '2px solid #bfdbfe', borderRadius: '8px', padding: '16px' },
  infoTitle: { fontSize: '1.125rem', fontWeight: 900, color: '#0c2340', margin: '0 0 8px 0' },
  infoText: { fontSize: '1rem', color: '#1e293b', fontWeight: 600, margin: 0 },
  buttons: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingBottom: '8px' },
  submitButton: { padding: '16px', borderRadius: '8px', fontWeight: 900, fontSize: '1.125rem', color: '#ffffff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'all 0.2s' },
  cancelButton: { padding: '16px', borderRadius: '8px', fontWeight: 900, fontSize: '1.125rem', background: '#e5e7eb', color: '#1e293b', border: 'none', cursor: 'pointer', transition: 'all 0.2s' },
  restrictedBox: { background: '#fef3c7', border: '2px solid #fcd34d', color: '#92400e', fontSize: '1rem', padding: '16px', borderRadius: '8px', fontWeight: 600 },
};

export default function CreateOutingPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    outingDate: '',
    outingTime: '',
    location: '',
    capacityAvailable: '',
    boatName: '',
    boatBrand: '',
    boatModel: '',
    boatColor: '',
    boatSize: '',
    boatCapacity: '',
    mooringLocation: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const loadExistingBoatData = async () => {
      if (!user || profile?.user_type !== 'owner') return;

      try {
        const { data: boats } = await supabase
          .from('boats')
          .select('*')
          .eq('owner_id', user.id)
          .limit(1);

        if (boats && boats.length > 0) {
          const boat = boats[0];
          setFormData((prev) => ({
            ...prev,
            boatName: boat.name || '',
            boatBrand: boat.brand || '',
            boatModel: boat.model || '',
            boatColor: boat.color || '',
            boatSize: boat.size_ft ? String(boat.size_ft) : '',
            boatCapacity: boat.capacity ? String(boat.capacity) : '',
            mooringLocation: boat.mooring_location || '',
          }));
        }
      } catch (err) {
        console.error('Error loading boat data:', err);
      }
    };

    loadExistingBoatData();
  }, [user, profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.outingDate || !formData.outingTime || !formData.location || !formData.capacityAvailable || !formData.boatName) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const { data: existingBoats, error: boatsError } = await supabase
        .from('boats')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      if (boatsError) throw boatsError;

      let boatId;

      if (existingBoats && existingBoats.length > 0) {
        boatId = existingBoats[0].id;
        const { error: updateError } = await supabase
          .from('boats')
          .update({
            name: formData.boatName,
            brand: formData.boatBrand || null,
            model: formData.boatModel || null,
            color: formData.boatColor || null,
            size_ft: formData.boatSize ? parseInt(formData.boatSize) : null,
            capacity: parseInt(formData.boatCapacity) || 1,
            mooring_location: formData.mooringLocation || null,
          })
          .eq('id', boatId);
        if (updateError) throw updateError;
      } else {
        const { data: newBoat, error: createError } = await supabase
          .from('boats')
          .insert([{
            owner_id: user.id,
            name: formData.boatName,
            brand: formData.boatBrand || null,
            model: formData.boatModel || null,
            color: formData.boatColor || null,
            size_ft: formData.boatSize ? parseInt(formData.boatSize) : null,
            capacity: parseInt(formData.boatCapacity) || 1,
            mooring_location: formData.mooringLocation || null,
          }])
          .select()
          .single();
        if (createError) throw createError;
        boatId = newBoat.id;
      }

      const { data: newOuting, error: outingError } = await supabase
        .from('outings')
        .insert([{
          boat_id: boatId,
          skipper_id: user.id,
          title: formData.title,
          description: formData.description || null,
          outing_date: formData.outingDate,
          outing_time: formData.outingTime,
          location: formData.location,
          capacity_available: parseInt(formData.capacityAvailable),
          status: 'open',
        }])
        .select()
        .single();

      if (outingError) throw outingError;
      navigate(`/outing/${newOuting.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create outing');
    } finally {
      setLoading(false);
    }
  };

  if (!user || profile?.user_type !== 'owner') {
    return <div style={styles.restrictedBox}>Only boat owners can create outings.</div>;
  }

  return (
    <div style={styles.container}>
      <button
        onClick={() => navigate('/skipper-dashboard')}
        style={styles.backButton}
        onMouseEnter={(e) => e.target.style.background = '#bfdbfe'}
        onMouseLeave={(e) => e.target.style.background = '#e0f2fe'}
      >
        ← Back to My Outings
      </button>

      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Post New Outing</h1>
        <p style={styles.headerSubtitle}>Fill in the details and crew can request to join</p>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>

        {/* Outing Details */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Outing Details</h2>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              style={styles.input}
              placeholder="e.g., Morning Cruise to Key Biscayne"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              style={styles.textarea}
              placeholder="Tell crew members about this outing..."
            />
          </div>

          <div style={styles.grid}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Date *</label>
              <input
                type="date"
                name="outingDate"
                value={formData.outingDate}
                onChange={handleInputChange}
                style={styles.input}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Time *</label>
              <input
                type="time"
                name="outingTime"
                value={formData.outingTime}
                onChange={handleInputChange}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Location *</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              style={styles.input}
              placeholder="e.g., Coconut Grove Marina, Slip 42"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Available Crew Spots *</label>
            <input
              type="number"
              name="capacityAvailable"
              value={formData.capacityAvailable}
              onChange={handleInputChange}
              min="1"
              style={styles.input}
              placeholder="How many crew members do you need?"
            />
          </div>
        </div>

        {/* Boat Details */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Boat Details</h2>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Boat Name *</label>
            <input
              type="text"
              name="boatName"
              value={formData.boatName}
              onChange={handleInputChange}
              style={styles.input}
              placeholder="e.g., Blue Horizon"
            />
          </div>

          <div style={styles.grid}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Brand</label>
              <input
                type="text"
                name="boatBrand"
                value={formData.boatBrand}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="e.g., Beneteau"
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Model</label>
              <input
                type="text"
                name="boatModel"
                value={formData.boatModel}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="e.g., Oceanis 38"
              />
            </div>
          </div>

          <div style={styles.grid}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Length (ft)</label>
              <input
                type="number"
                name="boatSize"
                value={formData.boatSize}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="38"
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Total Capacity</label>
              <input
                type="number"
                name="boatCapacity"
                value={formData.boatCapacity}
                onChange={handleInputChange}
                min="1"
                style={styles.input}
                placeholder="Including skipper"
              />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Mooring / Marina</label>
            <input
              type="text"
              name="mooringLocation"
              value={formData.mooringLocation}
              onChange={handleInputChange}
              style={styles.input}
              placeholder="e.g., Coconut Grove Marina"
            />
          </div>
        </div>

        {/* Skipper info */}
        <div style={styles.infoBox}>
          <h2 style={styles.infoTitle}>Skipper</h2>
          <p style={styles.infoText}>{profile?.full_name || 'You'} · {user?.email}</p>
        </div>

        <div style={styles.buttons}>
          <button
            type="submit"
            disabled={loading}
            style={{...styles.submitButton, background: loading ? '#9ca3af' : '#06b6d4', opacity: loading ? 0.5 : 1}}
            onMouseEnter={(e) => !loading && (e.target.style.opacity = '0.9')}
            onMouseLeave={(e) => !loading && (e.target.style.opacity = '1')}
          >
            {loading ? 'Posting...' : 'Post Outing →'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/skipper-dashboard')}
            style={styles.cancelButton}
            onMouseEnter={(e) => e.target.style.background = '#d1d5db'}
            onMouseLeave={(e) => e.target.style.background = '#e5e7eb'}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
