import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

export default function OuttingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [outing, setOuting] = useState(null);
  const [skipper, setSkipper] = useState(null);
  const [boat, setBoat] = useState(null);
  const [crewRequest, setCrewRequest] = useState(null);
  const [crewRequests, setCrewRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    const fetchOuttingDetails = async () => {
      try {
        const { data: outingData, error: outingError } = await supabase
          .from('outings')
          .select('*')
          .eq('id', id)
          .single();

        if (outingError) throw outingError;
        setOuting(outingData);

        const { data: skipperData, error: skipperError } = await supabase
          .from('users')
          .select('*')
          .eq('id', outingData.skipper_id)
          .single();

        if (skipperError) throw skipperError;
        setSkipper(skipperData);

        const { data: boatData, error: boatError } = await supabase
          .from('boats')
          .select('*')
          .eq('id', outingData.boat_id)
          .single();

        if (boatError) throw boatError;
        setBoat(boatData);

        if (user) {
          const { data: requestData } = await supabase
            .from('crew_requests')
            .select('*')
            .eq('outing_id', id)
            .eq('crew_id', user.id)
            .single();

          setCrewRequest(requestData || null);

          // If skipper, fetch all crew requests
          if (user.id === outingData.skipper_id) {
            const { data: allRequests } = await supabase
              .from('crew_requests')
              .select(`*, crew:crew_id (id, full_name, photo_url, bio, sailing_experience)`)
              .eq('outing_id', id)
              .order('requested_at', { ascending: false });

            setCrewRequests(allRequests || []);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOuttingDetails();
  }, [id, user]);

  const handleRequestToJoin = async () => {
    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from('crew_requests')
        .insert([
          {
            outing_id: id,
            crew_id: user.id,
            status: 'pending',
            requested_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      setCrewRequest(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [requestId]: true }));
      const { error } = await supabase
        .from('crew_requests')
        .update({ status: 'approved', responded_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;
      setCrewRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: 'approved' } : req
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [requestId]: true }));
      const { error } = await supabase
        .from('crew_requests')
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;
      setCrewRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: 'declined' } : req
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600"></div>
      </div>
    );
  }

  if (error || !outing || !skipper || !boat) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error || 'Outing not found'}
      </div>
    );
  }

  const isSkipper = user && user.id === outing.skipper_id;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/')}
        className="text-ocean-600 hover:text-ocean-700 font-medium mb-4"
      >
        ← Back to Outings
      </button>

      <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {outing.title}
            </h1>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${getStatusColor(outing.status)}`}>
              {outing.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Outing Details
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Date & Time</p>
                <p className="text-lg font-medium text-gray-900">
                  {new Date(outing.outing_date).toLocaleDateString()} at{' '}
                  {outing.outing_time}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Crew Spots Available</p>
                <p className="text-lg font-medium text-gray-900">
                  {outing.capacity_available} available
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Description</p>
                <p className="text-gray-900 leading-relaxed">
                  {outing.description}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Boat Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Boat Name</p>
                  <p className="text-lg font-medium text-gray-900">
                    {boat.name}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Boat Type</p>
                  <p className="text-lg font-medium text-gray-900 capitalize">
                    {boat.boat_type}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Size</p>
                  <p className="text-lg font-medium text-gray-900">
                    {boat.size_ft} ft
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Total Capacity</p>
                  <p className="text-lg font-medium text-gray-900">
                    {boat.capacity} people
                  </p>
                </div>

                {boat.mooring_location && (
                  <div>
                    <p className="text-sm text-gray-600">Mooring Location</p>
                    <p className="text-lg font-medium text-gray-900">
                      {boat.mooring_location}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Skipper
              </h2>
              <div className="border border-gray-200 rounded-lg p-4">
                {skipper.photo_url && (
                  <img
                    src={skipper.photo_url}
                    alt={skipper.full_name}
                    className="w-16 h-16 rounded-full mb-3 object-cover"
                  />
                )}
                <p className="font-semibold text-gray-900">
                  {skipper.full_name}
                </p>
                <p className="text-sm text-gray-600 capitalize">
                  {skipper.sailing_experience} sailor
                </p>
                {skipper.bio && (
                  <p className="text-sm text-gray-700 mt-2">{skipper.bio}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Crew Requests (for skipper) */}
        {isSkipper && (
          <div className="border-t pt-6 mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Crew Requests ({crewRequests.length})
            </h2>

            {crewRequests.length === 0 ? (
              <p className="text-gray-600">No crew requests yet</p>
            ) : (
              <div className="space-y-4">
                {crewRequests.map((req) => (
                  <div
                    key={req.id}
                    className={`border rounded-lg p-4 ${
                      req.status === 'pending'
                        ? 'border-yellow-200 bg-yellow-50'
                        : req.status === 'approved'
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {req.crew?.photo_url && (
                        <img
                          src={req.crew.photo_url}
                          alt={req.crew.full_name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-lg">
                          {req.crew?.full_name}
                        </p>
                        <p className="text-sm text-gray-600 capitalize">
                          {req.crew?.sailing_experience} sailor
                        </p>
                        {req.crew?.bio && (
                          <p className="text-sm text-gray-700 mt-2">
                            {req.crew.bio}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Requested:{' '}
                          {new Date(req.requested_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-col flex-shrink-0">
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveRequest(req.id)}
                              disabled={actionLoading[req.id]}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-lg text-sm transition"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleDeclineRequest(req.id)}
                              disabled={actionLoading[req.id]}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold rounded-lg text-sm transition"
                            >
                              ✗ Decline
                            </button>
                          </>
                        )}
                        {req.status !== 'pending' && (
                          <p
                            className={`px-3 py-2 rounded-lg text-sm font-bold text-center ${
                              req.status === 'approved'
                                ? 'bg-green-600 text-white'
                                : 'bg-red-600 text-white'
                            }`}
                          >
                            {req.status === 'approved' ? 'Approved' : 'Declined'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Join/Request Section (for crew) */}
        {!isSkipper && (
          <div className="border-t pt-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Join This Outing
            </h2>

            {!user ? (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
                <p>Sign in to request to join this outing</p>
              </div>
            ) : crewRequest ? (
              <div className={`rounded-lg p-4 ${getStatusColor(crewRequest.status)}`}>
                <p className="font-semibold mb-2 capitalize">
                  Request Status: {crewRequest.status}
                </p>
                {crewRequest.status === 'pending' && (
                  <p className="text-sm">
                    Waiting for the skipper to review your request
                  </p>
                )}
                {crewRequest.status === 'approved' && (
                  <p className="text-sm">
                    Great! You're approved to join this outing
                  </p>
                )}
                {crewRequest.status === 'declined' && (
                  <p className="text-sm">
                    Your request was not approved for this outing
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={handleRequestToJoin}
                disabled={submitting}
                className="text-white px-6 py-3 rounded-lg font-semibold transition w-full md:w-auto"
                style={{background: submitting ? '#9ca3af' : '#06b6d4'}}
              >
                {submitting ? 'Submitting Request...' : 'Request to Join'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
