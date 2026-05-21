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
          .select(`*, boats (name, boat_type, size_ft)`)
          .eq('skipper_id', user.id)
          .order('outing_date', { ascending: true });

        if (outingsError) throw outingsError;

        const outingsWithRequests = await Promise.all(
          outingsData.map(async (outing) => {
            const { data: requestsData } = await supabase
              .from('crew_requests')
              .select(`*, crew:crew_id (id, full_name, photo_url, bio, sailing_experience)`)
              .eq('outing_id', outing.id);
            return { ...outing, crew_requests: requestsData || [] };
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
    setExpandedOutings((prev) => ({ ...prev, [outingId]: !prev[outingId] }));
  };

  const handleApprove = async (requestId, outingId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [requestId]: true }));
      const { error } = await supabase
        .from('crew_requests')
        .update({ status: 'approved', responded_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
      setOutings((prev) => prev.map((o) => o.id !== outingId ? o : {
        ...o,
        crew_requests: o.crew_requests.map((r) =>
          r.id === requestId ? { ...r, status: 'approved' } : r
        ),
      }));
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
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
      setOutings((prev) => prev.map((o) => o.id !== outingId ? o : {
        ...o,
        crew_requests: o.crew_requests.map((r) =>
          r.id === requestId ? { ...r, status: 'declined' } : r
        ),
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="rounded-2xl p-6 mb-6" style={{background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)'}}>
        <h1 className="text-3xl font-black text-white mb-1">📋 My Outings</h1>
        <p className="text-blue-100 text-lg font-semibold">Manage your sails and review crew requests</p>
      </div>

      {error && (
        <div className="bg-red-100 border-2 border-red-400 text-red-800 text-xl px-5 py-4 rounded-xl mb-6 font-semibold">{error}</div>
      )}

      <button
        onClick={() => navigate('/create-outing')}
        className="w-full py-5 rounded-2xl font-black text-white text-2xl mb-6 shadow-lg transition"
        style={{background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)'}}
      >
        + Post New Outing
      </button>

      {outings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-6xl mb-4">⛵</p>
          <p className="text-2xl font-black text-gray-800 mb-2">No outings yet</p>
          <p className="text-lg text-gray-600 font-semibold">Post your first outing above and crew will start requesting to join.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {outings.map((outing) => {
            const isExpanded = expandedOutings[outing.id];
            const pending = outing.crew_requests.filter((r) => r.status === 'pending');
            const approved = outing.crew_requests.filter((r) => r.status === 'approved');
            const declined = outing.crew_requests.filter((r) => r.status === 'declined');

            return (
              <div key={outing.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleExpanded(outing.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex-1 text-left">
                    <h3 className="text-xl font-black text-gray-900">{outing.title}</h3>
                    <p className="text-base text-gray-600 font-semibold mt-1">
                      📅 {new Date(outing.outing_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {outing.outing_time}
                    </p>
                    <p className="text-base text-gray-600 font-semibold">🚢 {outing.boats?.name}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    {pending.length > 0 && (
                      <span className="bg-yellow-100 text-yellow-800 text-lg font-black px-3 py-1 rounded-full">
                        {pending.length} pending
                      </span>
                    )}
                    <svg className={`w-6 h-6 text-gray-400 transition transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-5">
                    {pending.length > 0 && (
                      <div>
                        <h4 className="text-xl font-black text-gray-900 mb-3">Pending Requests ({pending.length})</h4>
                        <div className="space-y-3">
                          {pending.map((req) => (
                            <div key={req.id} className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                              <div className="flex items-start gap-3 mb-3">
                                {req.crew?.photo_url && (
                                  <img src={req.crew.photo_url} alt={req.crew.full_name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                                )}
                                <div>
                                  <p className="text-xl font-black text-gray-900">{req.crew?.full_name}</p>
                                  <p className="text-base text-gray-600 font-semibold capitalize">{req.crew?.sailing_experience} sailor</p>
                                  {req.crew?.bio && <p className="text-base text-gray-700 mt-1">{req.crew.bio}</p>}
                                </div>
                              </div>
                              <div className="flex gap-3">
                                <button
                                  onClick={() => handleApprove(req.id, outing.id)}
                                  disabled={actionLoading[req.id]}
                                  className="flex-1 py-3 rounded-xl font-black text-white text-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 transition"
                                >
                                  {actionLoading[req.id] ? '...' : '✓ Approve'}
                                </button>
                                <button
                                  onClick={() => handleDecline(req.id, outing.id)}
                                  disabled={actionLoading[req.id]}
                                  className="flex-1 py-3 rounded-xl font-black text-white text-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 transition"
                                >
                                  {actionLoading[req.id] ? '...' : '✗ Decline'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {approved.length > 0 && (
                      <div>
                        <h4 className="text-xl font-black text-gray-900 mb-3">✅ Approved Crew ({approved.length})</h4>
                        <div className="space-y-2">
                          {approved.map((req) => (
                            <div key={req.id} className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                              {req.crew?.photo_url && (
                                <img src={req.crew.photo_url} alt={req.crew.full_name} className="w-12 h-12 rounded-full object-cover" />
                              )}
                              <div>
                                <p className="text-lg font-black text-gray-900">{req.crew?.full_name}</p>
                                <p className="text-base text-gray-600 font-semibold capitalize">{req.crew?.sailing_experience} sailor</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {declined.length > 0 && (
                      <div>
                        <h4 className="text-xl font-black text-gray-900 mb-3">Declined ({declined.length})</h4>
                        <div className="space-y-1">
                          {declined.map((req) => (
                            <p key={req.id} className="text-lg text-gray-500 font-semibold">{req.crew?.full_name}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {outing.crew_requests.length === 0 && (
                      <p className="text-lg text-gray-500 font-semibold">No crew requests yet</p>
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
