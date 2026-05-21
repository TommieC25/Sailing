import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

const fieldClass = "w-full px-5 py-4 border-2 border-blue-200 rounded-xl text-blue-900 text-xl font-semibold placeholder-blue-300 focus:outline-none focus:border-blue-600 bg-white";
const labelClass = "block text-xl font-black text-gray-800 mb-2";

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
    return (
      <div className="bg-yellow-50 border-2 border-yellow-400 text-yellow-800 text-xl px-5 py-4 rounded-xl font-semibold">
        Only boat owners can create outings.
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate('/skipper-dashboard')} className="text-blue-700 font-black text-xl mb-5 flex items-center gap-2">
        ← Back to My Outings
      </button>

      {/* Header */}
      <div className="rounded-2xl p-6 mb-6" style={{background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)'}}>
        <h1 className="text-3xl font-black text-white mb-1">Post New Outing</h1>
        <p className="text-blue-100 text-lg font-semibold">Fill in the details and crew can request to join</p>
      </div>

      {error && (
        <div className="bg-red-100 border-2 border-red-400 text-red-800 text-xl px-5 py-4 rounded-xl mb-6 font-semibold">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Outing Details */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
          <h2 className="text-2xl font-black text-gray-900 border-b border-gray-100 pb-3">Outing Details</h2>

          <div>
            <label className={labelClass}>Title *</label>
            <input type="text" name="title" value={formData.title} onChange={handleInputChange} className={fieldClass} placeholder="e.g., Morning Cruise to Key Biscayne" />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" className={fieldClass} placeholder="Tell crew members about this outing..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date *</label>
              <input type="date" name="outingDate" value={formData.outingDate} onChange={handleInputChange} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Time *</label>
              <input type="time" name="outingTime" value={formData.outingTime} onChange={handleInputChange} className={fieldClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Location *</label>
            <input type="text" name="location" value={formData.location} onChange={handleInputChange} className={fieldClass} placeholder="e.g., Coconut Grove Marina, Slip 42" />
          </div>

          <div>
            <label className={labelClass}>Available Crew Spots *</label>
            <input type="number" name="capacityAvailable" value={formData.capacityAvailable} onChange={handleInputChange} min="1" className={fieldClass} placeholder="How many crew members do you need?" />
          </div>
        </div>

        {/* Boat Details */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
          <h2 className="text-2xl font-black text-gray-900 border-b border-gray-100 pb-3">Boat Details</h2>

          <div>
            <label className={labelClass}>Boat Name *</label>
            <input type="text" name="boatName" value={formData.boatName} onChange={handleInputChange} className={fieldClass} placeholder="e.g., Blue Horizon" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Brand</label>
              <input type="text" name="boatBrand" value={formData.boatBrand} onChange={handleInputChange} className={fieldClass} placeholder="e.g., Beneteau" />
            </div>
            <div>
              <label className={labelClass}>Model</label>
              <input type="text" name="boatModel" value={formData.boatModel} onChange={handleInputChange} className={fieldClass} placeholder="e.g., Oceanis 38" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Length (ft)</label>
              <input type="number" name="boatSize" value={formData.boatSize} onChange={handleInputChange} className={fieldClass} placeholder="38" />
            </div>
            <div>
              <label className={labelClass}>Total Capacity</label>
              <input type="number" name="boatCapacity" value={formData.boatCapacity} onChange={handleInputChange} min="1" className={fieldClass} placeholder="Including skipper" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Mooring / Marina</label>
            <input type="text" name="mooringLocation" value={formData.mooringLocation} onChange={handleInputChange} className={fieldClass} placeholder="e.g., Coconut Grove Marina" />
          </div>
        </div>

        {/* Skipper info */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <h2 className="text-xl font-black text-blue-900 mb-3">Skipper</h2>
          <p className="text-lg text-blue-800 font-semibold">{profile?.full_name || 'You'} · {user?.email}</p>
        </div>

        <div className="flex gap-4 pb-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-5 rounded-2xl font-black text-white text-2xl shadow-lg transition disabled:opacity-50"
            style={{background: loading ? '#9ca3af' : 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)'}}
          >
            {loading ? 'Posting...' : 'Post Outing →'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/skipper-dashboard')}
            className="flex-1 py-5 rounded-2xl font-black text-gray-700 text-2xl bg-gray-200 hover:bg-gray-300 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
