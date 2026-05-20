import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

export default function SkipperDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [outings, setOutings] = useState([]);
  const [expandedOutings, setExpandedOutings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (!user || profile?.user_type !== 'owner') {
      navigate('/');
      return;
    }

    const fetchSkipperOutings = async () => {
      try {
        const { data: outingsData, error: outingsError } = await supabase
          .from('outings')
          .select(
            `
            *,
            boats (
              name,
              boat_type,
              size_ft
            )
          `
          )
          .eq('skipper_id', user.id)
          .order('outing_date', { ascending: true });

        if (outingsError) throw outingsError;

        const outingsWithRequests = await Promise.all(
          outingsData.map(async (outing) => {
            const { data: requestsData } = await supabase
              .from('crew_requests')
              .select(
                `
                *,
                crew:crew_id (
                  id,
                  full_name,
                  photo_url,
                  bio,
                  sailing_experience
                )
              `
              )
              .eq('outing_id', outing.id);

            return {
              ...outing,
              crew_requests: requestsData || [],
            };
          })
        );

        setOutings(outingsWithRequests);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSkipperOutings();
  }, [user, profile, navigate]);

  const toggleExpanded = (outingId) => {
    setExpandedOutings((prev) => ({
      ...prev,
      [outingId]: !prev[outingId],
    }));
  };

  const handleApprove = async (requestId, outingId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [requestId]: true }));

      const { error } = await supabase
        .from('crew_requests')
        .update({
          status: 'approved',
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      setOutings((prev) =>
        prev.map((outing) => {
          if (outing.id === outingId) {
            return {
              ...outing,
              crew_requests: outing.crew_requests.map((req) =>
                req.id === requestId
                  ? { ...req, status: 'approved', responded_at: new Date().toISOString() }
                  : req
              ),
            };
          }
          return outing;
        })
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleDecline = async (requestId, outingId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [requestId]: true }));

      const { error } = await supabase
        .from('crew_requests')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      setOutings((prev) =>
        prev.map((outing) => {
          if (outing.id === outingId) {
            return {
              ...outing,
              crew_requests: outing.crew_requests.map((req) =>
                req.id === requestId
                  ? { ...req, status: 'declined', responded_at: new Date().toISOString() }
                  : req
              ),
            };
          }
          return outing;
        })
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Outings</h1>
          <p className="text-gray-600">
            Manage your outings and review crew requests
          </p>
        </div>
        <button
          onClick={() => navigate('/create-outing')}
          className="bg-ocean-600 hover:bg-ocean-700 text-white px-6 py-3 rounded-lg font-semibold transition w-full md:w-auto"
        >
          + Create Outing
        </button>
      </div>

      {outings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-600 mb-6">You haven't created any outings yet</p>
          <button
            onClick={() => navigate('/create-outing')}
            className="inline-block bg-ocean-600 hover:bg-ocean-700 text-white px-6 py-3 rounded-lg font-semibold transition mb-3"
          >
            Create Your First Outing
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {outings.map((outing) => {
            const isExpanded = expandedOutings[outing.id];
            const pendingRequests = outing.crew_requests.filter(
              (r) => r.status === 'pending'
            );
            const approvedRequests = outing.crew_requests.filter(
              (r) => r.status === 'approved'
            );
            const declinedRequests = outing.crew_requests.filter(
              (r) => r.status === 'declined'
            );

            return (
              <div key={outing.id} className="bg-white rounded-lg shadow">
                <button
                  onClick={() => toggleExpanded(outing.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {outing.title}
                    </h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                      <span>{new Date(outing.outing_date).toLocaleDateString()}</span>
                      <span>{outing.boats?.name}</span>
                      <span>{outing.boats?.boat_type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {pendingRequests.length}
                      </p>
                      <p className="text-xs text-gray-600">pending</p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t px-6 py-4 space-y-6">
                    {pendingRequests.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Pending Requests ({pendingRequests.length})
                        </h4>
                        <div className="space-y-3">
                          {pendingRequests.map((request) => (
                            <div
                              key={request.id}
                              className="border border-yellow-200 bg-yellow-50 rounded-lg p-4"
                            >
                              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="flex-1">
                                  {request.crew?.photo_url && (
                                    <img
                                      src={request.crew.photo_url}
                                      alt={request.crew.full_name}
                                      className="w-12 h-12 rounded-full mb-2 object-cover"
                                    />
                                  )}
                                  <p className="font-semibold text-gray-900">
                                    {request.crew?.full_name}
                                  </p>
                                  <p className="text-sm text-gray-600 capitalize">
                                    {request.crew?.sailing_experience} sailor
                                  </p>
                                  {request.crew?.bio && (
                                    <p className="text-sm text-gray-700 mt-2">
                                      {request.crew.bio}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2 md:flex-col">
                                  <button
                                    onClick={() =>
                                      handleApprove(request.id, outing.id)
                                    }
                                    disabled={actionLoading[request.id]}
                                    className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium transition text-sm"
                                  >
                                    {actionLoading[request.id] ? '...' : 'Approve'}
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDecline(request.id, outing.id)
                                    }
                                    disabled={actionLoading[request.id]}
                                    className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium transition text-sm"
                                  >
                                    {actionLoading[request.id] ? '...' : 'Decline'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {approvedRequests.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Approved Crew ({approvedRequests.length})
                        </h4>
                        <div className="space-y-3">
                          {approvedRequests.map((request) => (
                            <div
                              key={request.id}
                              className="border border-green-200 bg-green-50 rounded-lg p-4"
                            >
                              <div className="flex items-start gap-3">
                                {request.crew?.photo_url && (
                                  <img
                                    src={request.crew.photo_url}
                                    alt={request.crew.full_name}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                )}
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {request.crew?.full_name}
                                  </p>
                                  <p className="text-sm text-gray-600 capitalize">
                                    {request.crew?.sailing_experience} sailor
                                  </p>
                                  {request.crew?.bio && (
                                    <p className="text-sm text-gray-700 mt-1">
                                      {request.crew.bio}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {declinedRequests.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Declined ({declinedRequests.length})
                        </h4>
                        <div className="space-y-2">
                          {declinedRequests.map((request) => (
                            <div
                              key={request.id}
                              className="text-sm text-gray-600"
                            >
                              {request.crew?.full_name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {outing.crew_requests.length === 0 && (
                      <p className="text-gray-600">No crew requests yet</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
