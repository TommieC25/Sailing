import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

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

    // Validation
    if (
      !formData.title ||
      !formData.outingDate ||
      !formData.outingTime ||
      !formData.location ||
      !formData.capacityAvailable ||
      !formData.boatName
    ) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      // First, check if user already has a boat or create/update one
      const { data: existingBoats, error: boatsError } = await supabase
        .from('boats')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      if (boatsError) throw boatsError;

      let boatId;

      if (existingBoats && existingBoats.length > 0) {
        // Update existing boat with new details
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
        // Create new boat
        const { data: newBoat, error: createError } = await supabase
          .from('boats')
          .insert([
            {
              owner_id: user.id,
              name: formData.boatName,
              brand: formData.boatBrand || null,
              model: formData.boatModel || null,
              color: formData.boatColor || null,
              size_ft: formData.boatSize ? parseInt(formData.boatSize) : null,
              capacity: parseInt(formData.boatCapacity) || 1,
              mooring_location: formData.mooringLocation || null,
            },
          ])
          .select()
          .single();

        if (createError) throw createError;
        boatId = newBoat.id;
      }

      // Create the outing
      const { data: newOuting, error: outingError } = await supabase
        .from('outings')
        .insert([
          {
            boat_id: boatId,
            skipper_id: user.id,
            title: formData.title,
            description: formData.description || null,
            outing_date: formData.outingDate,
            outing_time: formData.outingTime,
            location: formData.location,
            capacity_available: parseInt(formData.capacityAvailable),
            status: 'open',
          },
        ])
        .select()
        .single();

      if (outingError) throw outingError;

      // Navigate to the new outing detail page
      navigate(`/outing/${newOuting.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create outing');
    } finally {
      setLoading(false);
    }
  };

  if (!user || profile?.user_type !== 'owner') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
        Only boat owners can create outings. Please sign up as a boat owner.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/skipper-dashboard')}
        className="text-ocean-600 hover:text-ocean-700 font-medium mb-6"
      >
        ← Back to My Outings
      </button>

      <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Outing</h1>
        <p className="text-gray-600 mb-6">Plan your next sailing adventure</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Outing Details Section */}
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Outing Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Outing Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  placeholder="e.g., Morning Cruise to Key Biscayne"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  placeholder="Tell crew members about this outing..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="outingDate"
                    value={formData.outingDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    name="outingTime"
                    value={formData.outingTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location (Marina/Slip/Mooring) *
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  placeholder="e.g., Coconut Grove Marina, Slip 42"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available Crew Spots *
                </label>
                <input
                  type="number"
                  name="capacityAvailable"
                  value={formData.capacityAvailable}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  placeholder="Number of crew members needed"
                />
              </div>
            </div>
          </div>

          {/* Boat Details Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Boat Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Boat Name *
                </label>
                <input
                  type="text"
                  name="boatName"
                  value={formData.boatName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  placeholder="e.g., Blue Horizon"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    name="boatBrand"
                    value={formData.boatBrand}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    placeholder="e.g., Beneteau"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    name="boatModel"
                    value={formData.boatModel}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    placeholder="e.g., Oceanis 38"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Length (ft)
                  </label>
                  <input
                    type="number"
                    name="boatSize"
                    value={formData.boatSize}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    placeholder="e.g., 38"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="text"
                    name="boatColor"
                    value={formData.boatColor}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    placeholder="e.g., White & Blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Capacity
                  </label>
                  <input
                    type="number"
                    name="boatCapacity"
                    value={formData.boatCapacity}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    placeholder="Total people including skipper"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mooring Location
                </label>
                <input
                  type="text"
                  name="mooringLocation"
                  value={formData.mooringLocation}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  placeholder="e.g., Coconut Grove Marina"
                />
              </div>
            </div>
          </div>

          {/* Skipper Info (Display Only) */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Skipper Information
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-gray-900">
                <span className="font-medium">Name:</span> {profile?.full_name}
              </p>
              <p className="text-gray-900">
                <span className="font-medium">Email:</span> {user?.email}
              </p>
              {profile?.phone && (
                <p className="text-gray-900">
                  <span className="font-medium">Phone:</span> {profile.phone}
                </p>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-ocean-600 hover:bg-ocean-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition"
            >
              {loading ? 'Creating Outing...' : 'Create Outing'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/skipper-dashboard')}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-3 rounded-lg font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
