import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const requiredFieldLabels = {
  title: 'Title',
  description: 'Description',
  outingDate: 'Date',
  outingTime: 'Time',
  location: 'Location',
  capacityAvailable: 'Available Crew Spots',
  boatName: 'Boat Name',
  boatBrandModelColor: 'Brand / Model / Color',
  boatSize: 'Length',
  boatCapacity: 'Total Capacity',
  mooringLocation: 'Mooring / Marina',
};

const requiredFieldMessages = {
  title: 'Please enter an outing title',
  description: 'Please enter an outing description',
  outingDate: 'Please select an outing date',
  outingTime: 'Please select an outing time',
  location: 'Please enter the outing location',
  capacityAvailable: 'Please enter the number of available crew spots',
  boatName: 'Please enter the boat name',
  boatBrandModelColor: 'Please enter the boat brand, model, and color',
  boatSize: 'Please enter the boat length',
  boatCapacity: 'Please enter the total boat capacity',
  mooringLocation: 'Please enter the mooring or marina',
};

export default function CreateOutingPage() {
  const navigate = useNavigate();
  const { id: outingId } = useParams();
  const isEditing = Boolean(outingId);
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [canEdit, setCanEdit] = useState(!isEditing);
  const [boatId, setBoatId] = useState(null);
  const [approvedCrewCount, setApprovedCrewCount] = useState(0);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    outingDate: '',
    outingTime: '',
    location: '',
    capacityAvailable: '',
    boatName: '',
    boatBrandModelColor: '',
    boatSize: '',
    boatCapacity: '',
    mooringLocation: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const loadFormData = async () => {
      if (!user || profile?.user_type !== 'owner') {
        setInitialLoading(false);
        return;
      }

      try {
        if (isEditing) setInitialLoading(true);
        let boat;
        let outing;

        if (isEditing) {
          const { data: outingData, error: outingError } = await supabase
            .from('outings')
            .select('*')
            .eq('id', outingId)
            .maybeSingle();
          if (outingError) throw outingError;
          if (!outingData || outingData.skipper_id !== user.id) {
            setCanEdit(false);
            return;
          }
          outing = outingData;
          setCanEdit(true);

          const { count: approvedCount, error: approvedError } = await supabase
            .from('crew_requests')
            .select('id', { count: 'exact', head: true })
            .eq('outing_id', outingData.id)
            .eq('status', 'approved');
          if (approvedError) throw approvedError;
          setApprovedCrewCount(approvedCount || 0);

          const { data: boatData, error: boatError } = await supabase
            .from('boats')
            .select('*')
            .eq('id', outingData.boat_id)
            .maybeSingle();
          if (boatError) throw boatError;
          boat = boatData;
        } else {
          const { data: boats, error: boatsError } = await supabase
            .from('boats')
            .select('*')
            .eq('owner_id', user.id)
            .limit(1);
          if (boatsError) throw boatsError;
          boat = boats?.[0];
        }

        if (boat) setBoatId(boat.id);
        const brandModelColor = [boat?.brand, boat?.model, boat?.color]
          .filter(Boolean)
          .join(' / ') || '';
        setFormData({
          title: outing?.title || '',
          description: outing?.description || '',
          outingDate: outing?.outing_date || '',
          outingTime: outing?.outing_time?.slice(0, 5) || '',
          location: outing?.location || '',
          capacityAvailable: outing?.capacity_available ? String(outing.capacity_available) : '',
          ...(boat ? {
            boatName: boat.name || '',
            boatBrandModelColor: brandModelColor,
            boatSize: boat.size_ft ? String(boat.size_ft) : '',
            boatCapacity: boat.capacity ? String(boat.capacity) : '',
            mooringLocation: boat.mooring_location || '',
          } : {
            boatName: '',
            boatBrandModelColor: '',
            boatSize: '',
            boatCapacity: '',
            mooringLocation: '',
          }),
        });
      } catch (err) {
        setError(err.message || 'Could not load outing details');
      } finally {
        setInitialLoading(false);
      }
    };

    loadFormData();
  }, [user, profile, isEditing, outingId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const missingField = Object.keys(requiredFieldLabels)
      .find((field) => !String(formData[field] || '').trim());

    if (missingField) {
      setError(requiredFieldMessages[missingField]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const crewSpots = Number.parseInt(formData.capacityAvailable, 10);
    const boatCapacity = Number.parseInt(formData.boatCapacity, 10);
    const boatSize = Number.parseInt(formData.boatSize, 10);

    if (!Number.isInteger(crewSpots) || crewSpots < 1) {
      setError('Available Crew Spots must be at least 1');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (
      isEditing
      && crewSpots < approvedCrewCount
      && !window.confirm(`${approvedCrewCount} crew members are already approved. Save only ${crewSpots} listed spots anyway?`)
    ) {
      return;
    }

    if (!Number.isInteger(boatCapacity) || boatCapacity < 1) {
      setError('Total Capacity must be at least 1');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!Number.isInteger(boatSize) || boatSize < 1) {
      setError('Length must be a positive number');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setLoading(true);

      let savedBoatId = boatId;

      const parts = formData.boatBrandModelColor.split('/').map(s => s.trim());

      if (savedBoatId) {
        const { error: updateError } = await supabase
          .from('boats')
          .update({
            name: formData.boatName,
            brand: parts[0] || null,
            model: parts[1] || null,
            color: parts[2] || null,
            size_ft: boatSize,
            capacity: boatCapacity,
            mooring_location: formData.mooringLocation || null,
          })
          .eq('id', savedBoatId);
        if (updateError) throw updateError;
      } else {
        const { data: newBoat, error: createError } = await supabase
          .from('boats')
          .insert([{
            owner_id: user.id,
            name: formData.boatName,
            brand: parts[0] || null,
            model: parts[1] || null,
            color: parts[2] || null,
            size_ft: boatSize,
            capacity: boatCapacity,
            mooring_location: formData.mooringLocation || null,
          }])
          .select()
          .single();
        if (createError) throw createError;
        savedBoatId = newBoat.id;
      }

      const outingValues = {
        boat_id: savedBoatId,
        title: formData.title,
        description: formData.description || null,
        outing_date: formData.outingDate,
        outing_time: formData.outingTime,
        location: formData.location,
        capacity_available: crewSpots,
      };

      const outingQuery = isEditing
        ? supabase.from('outings').update(outingValues).eq('id', outingId).eq('skipper_id', user.id)
        : supabase.from('outings').insert([{ ...outingValues, skipper_id: user.id, status: 'open' }]);

      const { data: savedOuting, error: outingError } = await outingQuery.select().single();

      if (outingError) throw outingError;
      navigate(`/outing/${savedOuting.id}`);
    } catch (err) {
      setError(err.message || `Failed to ${isEditing ? 'update' : 'create'} outing`);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || initialLoading) {
    return (
      <div style={{textAlign: 'center', padding: '40px'}}>
        <div style={{display: 'inline-block', width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#0369a1', animation: 'spin 0.8s linear infinite'}} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user || profile?.user_type !== 'owner') {
    return <div style={styles.restrictedBox}>Only boat owners can create outings. Please update your profile to set your account type to "Boat Owner".</div>;
  }

  if (!canEdit) {
    return <div style={styles.restrictedBox}>Only the skipper who posted this outing can edit it.</div>;
  }

  return (
    <div style={styles.container}>
      <button
        onClick={() => navigate(isEditing ? `/outing/${outingId}` : '/skipper-dashboard')}
        style={styles.backButton}
        onMouseEnter={(e) => e.target.style.background = '#bfdbfe'}
        onMouseLeave={(e) => e.target.style.background = '#e0f2fe'}
      >
        ← Back to {isEditing ? 'Outing' : 'My Outings'}
      </button>

      <div style={styles.header}>
        <h1 style={styles.headerTitle}>{isEditing ? 'Edit Outing' : 'Post New Outing'}</h1>
        <p style={styles.headerSubtitle}>{isEditing ? 'Update the details visible to crew' : 'Fill in the details and crew can request to join'}</p>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form} noValidate>

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
              required
              style={styles.input}
              placeholder="e.g., Morning Cruise to Key Biscayne"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
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
                required
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
                required
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
              required
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
              required
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
              required
              style={styles.input}
              placeholder="e.g., Blue Horizon"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Brand / Model / Color *</label>
            <input
              type="text"
              name="boatBrandModelColor"
              value={formData.boatBrandModelColor}
              onChange={handleInputChange}
              required
              style={styles.input}
              placeholder="e.g., Beneteau / Oceanis 38 / blue"
            />
          </div>

          <div style={styles.grid}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Length (ft) *</label>
              <input
                type="number"
                name="boatSize"
                value={formData.boatSize}
                onChange={handleInputChange}
                min="1"
                required
                style={styles.input}
                placeholder="38"
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Total Capacity *</label>
              <input
                type="number"
                name="boatCapacity"
                value={formData.boatCapacity}
                onChange={handleInputChange}
                min="1"
                required
                style={styles.input}
                placeholder="Including skipper"
              />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Mooring / Marina *</label>
            <input
              type="text"
              name="mooringLocation"
              value={formData.mooringLocation}
              onChange={handleInputChange}
              required
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
            {loading ? (isEditing ? 'Saving...' : 'Posting...') : (isEditing ? 'Save Changes' : 'Post Outing →')}
          </button>
          <button
            type="button"
            onClick={() => navigate(isEditing ? `/outing/${outingId}` : '/skipper-dashboard')}
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
