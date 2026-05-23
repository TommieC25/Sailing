import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

const styles = {
  container: { maxWidth: '800px', margin: '0 auto' },
  header: { borderRadius: '16px', padding: '24px', marginBottom: '24px', background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)' },
  headerTitle: { fontSize: '1.875rem', fontWeight: 900, color: '#ffffff', marginBottom: '8px', margin: '0 0 8px 0' },
  headerSubtitle: { color: '#e0f2fe', fontSize: '1.125rem', fontWeight: 600 },
  errorBox: { background: '#fee2e2', border: '2px solid #dc2626', color: '#7f1d1d', fontSize: '1.125rem', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', fontWeight: 600 },
  button: { width: '100%', padding: '20px 16px', borderRadius: '16px', fontWeight: 900, fontSize: '1.25rem', background: '#06b6d4', color: '#ffffff', border: 'none', cursor: 'pointer', marginBottom: '24px', transition: 'all 0.2s' },
  emptyBox: { background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '32px', textAlign: 'center' },
  emptyIcon: { fontSize: '3rem', marginBottom: '16px' },
  emptyTitle: { fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px', margin: '0 0 8px 0' },
  emptyText: { fontSize: '1.125rem', color: '#64748b', fontWeight: 600, margin: 0 },
  outingsList: { display: 'grid', gap: '16px' },
  outingCard: { background: '#ffffff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' },
  outingHeader: { width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s' },
  outingHeaderHover: { background: '#f9fafb' },
  outingTitle: { fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', margin: 0 },
  outingDetails: { fontSize: '1rem', color: '#64748b', fontWeight: 600, marginTop: '8px' },
  outingMeta: { display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px' },
  badge: { background: '#fef3c7', color: '#92400e', fontSize: '1.125rem', fontWeight: 900, padding: '4px 12px', borderRadius: '999px' },
  expandedSection: { borderTop: '1px solid #f3f4f6', padding: '20px', display: 'grid', gap: '20px' },
  sectionTitle: { fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '12px', margin: '0 0 12px 0' },
  requestsList: { display: 'grid', gap: '12px' },
  pendingRequest: { background: '#fffbeb', border: '2px solid #fcd34d', borderRadius: '12px', padding: '16px' },
  requestHeader: { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' },
  photo: { width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  photoPlaceholder: { width: '56px', height: '56px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.5rem' },
  requestName: { fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', margin: 0 },
  requestSkill: { fontSize: '1rem', color: '#64748b', fontWeight: 600, marginTop: '4px', textTransform: 'capitalize' },
  requestBio: { fontSize: '1rem', color: '#374151', marginTop: '8px' },
  requestActions: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' },
  approveBtn: { padding: '12px 16px', borderRadius: '12px', fontWeight: 900, fontSize: '1rem', background: '#16a34a', color: '#ffffff', border: 'none', cursor: 'pointer', transition: 'all 0.2s' },
  declineBtn: { padding: '12px 16px', borderRadius: '12px', fontWeight: 900, fontSize: '1rem', background: '#dc2626', color: '#ffffff', border: 'none', cursor: 'pointer', transition: 'all 0.2s' },
  profileBtn: { display: 'block', textAlign: 'center', padding: '12px 16px', borderRadius: '12px', fontWeight: 900, fontSize: '1rem', background: '#0369a1', color: '#ffffff', textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s' },
  approvedRequest: { background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' },
  approvedSmallPhoto: { width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' },
  approvedName: { fontSize: '1.125rem', fontWeight: 900, color: '#1e293b', margin: 0 },
  approvedSkill: { fontSize: '1rem', color: '#64748b', fontWeight: 600, marginTop: '2px', textTransform: 'capitalize' },
  declinedText: { fontSize: '1.125rem', color: '#6b7280', fontWeight: 600 },
  noRequests: { fontSize: '1.125rem', color: '#6b7280', fontWeight: 600 },
};

export default function SkipperDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();
  const [outings, setOutings] = useState([]);
  const [expandedOutings, setExpandedOutings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [hoveredOutingId, setHoveredOutingId] = useState(null);

  const refreshNotificationCounts = () => {
    window.dispatchEvent(new Event('sailing:crew-requests-updated'));
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user || profile?.user_type !== 'owner') {
      navigate('/');
      return;
    }

    const fetchSkipperOutings = async () => {
      try {
        const { data: outingsData, error: outingsError } = await supabase
          .from('outings')
          .select(`*, boats (name, size_ft)`)
          .eq('skipper_id', user.id)
          .order('outing_date', { ascending: true });

        if (outingsError) throw outingsError;

        const outingsWithRequests = await Promise.all(
          outingsData.map(async (outing) => {
            const { data: requestsData, error: requestsError } = await supabase
              .from('crew_requests')
              .select('*')
              .eq('outing_id', outing.id);

            if (requestsError) throw requestsError;

            const crewIds = [...new Set((requestsData || []).map((request) => request.crew_id).filter(Boolean))];
            const { data: crewProfiles, error: crewError } = crewIds.length
              ? await supabase
                  .from('public_profiles')
                  .select('id, full_name, photo_url, bio, sailing_experience')
                  .in('id', crewIds)
              : { data: [], error: null };

            if (crewError) throw crewError;

            const crewById = Object.fromEntries((crewProfiles || []).map((crew) => [crew.id, crew]));
            const requestsWithProfiles = (requestsData || []).map((request) => ({
              ...request,
              crew: crewById[request.crew_id] || null,
            }));

            return { ...outing, crew_requests: requestsWithProfiles };
          })
        );

        setOutings(outingsWithRequests);
        if (searchParams.get('show') === 'pending') {
          const pendingExpanded = Object.fromEntries(
            outingsWithRequests
              .filter((outing) => outing.crew_requests.some((request) => request.status === 'pending'))
              .map((outing) => [outing.id, true])
          );
          setExpandedOutings(pendingExpanded);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSkipperOutings();
  }, [authLoading, user, profile, navigate, searchParams]);

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
      refreshNotificationCounts();
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
      refreshNotificationCounts();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const generateCalendarLink = (outing) => {
    const date = new Date(outing.outing_date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const timeParts = outing.outing_time.match(/(\d+):(\d+)/);
    const hour = timeParts ? String(timeParts[1]).padStart(2, '0') : '09';
    const minute = timeParts ? String(timeParts[2]).padStart(2, '0') : '00';

    const startTime = `${dateStr}T${hour}${minute}00`;
    const endHour = String((parseInt(hour) + 2) % 24).padStart(2, '0');
    const endTime = `${dateStr}T${endHour}${minute}00`;

    const title = encodeURIComponent(outing.title);
    const details = encodeURIComponent(`${outing.description || ''}\n\nBoat: ${outing.boats?.name || 'TBD'}`);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}`;
  };

  if (loading) {
    return (
      <div style={{textAlign: 'center', padding: '64px 16px'}}>
        <div style={{display: 'inline-block', width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#0369a1', animation: 'spin 0.8s linear infinite'}} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>📋 My Outings</h1>
        <p style={styles.headerSubtitle}>Manage your sails and review crew requests</p>
      </div>

      {loading && (
        <div style={{textAlign: 'center', padding: '40px'}}>
          <div style={{display: 'inline-block', width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#0369a1', animation: 'spin 0.8s linear infinite'}} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {!loading && (
        <>
          {error && <div style={styles.errorBox}>{error}</div>}

          <button
            onClick={() => navigate('/create-outing')}
            style={styles.button}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            + Post New Outing
          </button>

          {outings.length === 0 ? (
            <div style={styles.emptyBox}>
              <div style={styles.emptyIcon}>⛵</div>
              <p style={styles.emptyTitle}>No outings yet</p>
              <p style={styles.emptyText}>Post your first outing above and crew will start requesting to join.</p>
            </div>
          ) : (
            <div style={styles.outingsList}>
          {outings.map((outing) => {
            const isExpanded = expandedOutings[outing.id];
            const pending = outing.crew_requests.filter((r) => r.status === 'pending');
            const approved = outing.crew_requests.filter((r) => r.status === 'approved');
            const declined = outing.crew_requests.filter((r) => r.status === 'declined');

            return (
              <div key={outing.id} style={styles.outingCard}>
                <button
                  onClick={() => toggleExpanded(outing.id)}
                  style={{
                    ...styles.outingHeader,
                    ...(hoveredOutingId === outing.id ? styles.outingHeaderHover : {})
                  }}
                  onMouseEnter={() => setHoveredOutingId(outing.id)}
                  onMouseLeave={() => setHoveredOutingId(null)}
                >
                  <div style={{flex: 1, textAlign: 'left'}}>
                    <h3 style={styles.outingTitle}>{outing.title}</h3>
                    <p style={styles.outingDetails}>
                      📅 {new Date(outing.outing_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {outing.outing_time}
                    </p>
                    <p style={styles.outingDetails}>🚢 {outing.boats?.name}</p>
                  </div>
                  <div style={styles.outingMeta}>
                    {pending.length > 0 && (
                      <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                        <svg style={{width: '24px', height: '24px', color: '#fbbf24'}} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M10 20h4c0 1.1-.9 2-2 2s-2-.9-2-2zm10-2v-5c0-3.07-1.64-5.64-4.5-6.32V2h-3v4.68C7.64 7.36 6 9.93 6 13v5H4v2h16v-2h-2z"/>
                        </svg>
                        <span style={{position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#ffffff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900}}>
                          {pending.length}
                        </span>
                      </div>
                    )}
                    <svg style={{width: '24px', height: '24px', color: '#9ca3af', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div style={styles.expandedSection}>
                    <div>
                      <a href={generateCalendarLink(outing)} target="_blank" rel="noopener noreferrer" style={{fontSize: '1rem', fontWeight: 900, color: '#0369a1', textDecoration: 'none', padding: '8px 12px', background: '#e0f2fe', borderRadius: '8px', display: 'inline-block'}}>
                        📅 Add to Calendar
                      </a>
                    </div>

                    {pending.length > 0 && (
                      <div>
                        <h4 style={styles.sectionTitle}>Pending Requests ({pending.length})</h4>
                        <div style={styles.requestsList}>
                          {pending.map((req) => (
                            <div key={req.id} style={styles.pendingRequest}>
                              <div style={styles.requestHeader}>
                                {req.crew?.photo_url ? (
                                  <img src={req.crew.photo_url} alt={req.crew.full_name} style={styles.photo} />
                                ) : (
                                  <div style={styles.photoPlaceholder}>📷</div>
                                )}
                                <div>
                                  <p style={styles.requestName}>{req.crew?.full_name}</p>
                                  <p style={styles.requestSkill}>{req.crew?.sailing_experience} sailor</p>
                                  {req.crew?.bio && <p style={styles.requestBio}>{req.crew.bio}</p>}
                                </div>
                              </div>
                              <div style={styles.requestActions}>
                                <button
                                  onClick={() => handleApprove(req.id, outing.id)}
                                  disabled={actionLoading[req.id]}
                                  style={{...styles.approveBtn, opacity: actionLoading[req.id] ? 0.5 : 1}}
                                  onMouseEnter={(e) => !actionLoading[req.id] && (e.target.style.background = '#15803d')}
                                  onMouseLeave={(e) => (e.target.style.background = '#16a34a')}
                                >
                                  {actionLoading[req.id] ? '...' : '✓ Approve'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/profile/${req.crew_id}?returnTo=${encodeURIComponent('/skipper-dashboard')}`)}
                                  style={styles.profileBtn}
                                  onMouseEnter={(e) => (e.target.style.background = '#075985')}
                                  onMouseLeave={(e) => (e.target.style.background = '#0369a1')}
                                >
                                  View Profile
                                </button>
                                <button
                                  onClick={() => handleDecline(req.id, outing.id)}
                                  disabled={actionLoading[req.id]}
                                  style={{...styles.declineBtn, opacity: actionLoading[req.id] ? 0.5 : 1}}
                                  onMouseEnter={(e) => !actionLoading[req.id] && (e.target.style.background = '#b91c1c')}
                                  onMouseLeave={(e) => (e.target.style.background = '#dc2626')}
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
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                          <h4 style={styles.sectionTitle}>✅ Approved Crew ({approved.length})</h4>
                        </div>
                        <div style={styles.requestsList}>
                          {approved.map((req) => (
                            <div key={req.id} style={styles.approvedRequest}>
                              {req.crew?.photo_url ? (
                                <img src={req.crew.photo_url} alt={req.crew.full_name} style={styles.approvedSmallPhoto} />
                              ) : (
                                <div style={{...styles.photoPlaceholder, width: '48px', height: '48px'}}>📷</div>
                              )}
                              <div>
                                <p style={styles.approvedName}>{req.crew?.full_name}</p>
                                <p style={styles.approvedSkill}>{req.crew?.sailing_experience} sailor</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {declined.length > 0 && (
                      <div>
                        <h4 style={styles.sectionTitle}>Declined ({declined.length})</h4>
                        <div>
                          {declined.map((req) => (
                            <p key={req.id} style={styles.declinedText}>{req.crew?.full_name}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {outing.crew_requests.length === 0 && (
                      <p style={styles.noRequests}>No crew requests yet</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
