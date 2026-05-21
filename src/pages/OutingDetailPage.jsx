import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

const styles = {
  container: { display: 'grid', gap: '24px' },
  backButton: { background: '#e0f2fe', border: '2px solid #0369a1', color: '#0369a1', fontSize: '1.125rem', fontWeight: 900, padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s' },
  mainCard: { background: '#ffffff', borderRadius: '8px', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', padding: '32px' },
  header: { display: 'grid', gap: '16px', marginBottom: '24px' },
  title: { fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937', margin: 0 },
  statusBadge: { display: 'inline-block', padding: '8px 12px', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600, textTransform: 'capitalize', width: 'fit-content' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' },
  section: { display: 'grid', gap: '12px' },
  sectionTitle: { fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: 0 },
  detailLabel: { fontSize: '0.875rem', color: '#6b7280' },
  detailValue: { fontSize: '1.125rem', fontWeight: 500, color: '#1f2937' },
  skipperCard: { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' },
  skipperPhoto: { width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px' },
  skipperPhotoPlaceholder: { width: '64px', height: '64px', borderRadius: '50%', background: '#e5e7eb', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' },
  skipperName: { fontWeight: 600, color: '#1f2937', margin: '0 0 4px 0' },
  skipperSkill: { fontSize: '0.875rem', color: '#6b7280', marginBottom: '8px', textTransform: 'capitalize' },
  skipperBio: { fontSize: '0.875rem', color: '#374151', marginTop: '8px' },
  crewRequestsSection: { borderTop: '1px solid #e5e7eb', paddingTop: '24px', marginTop: '24px' },
  crewRequestsTitle: { fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px', margin: '0 0 16px 0' },
  requestsList: { display: 'grid', gap: '16px' },
  requestCard: { borderRadius: '8px', padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start' },
  requestCardPending: { borderLeft: '4px solid #fbbf24', background: '#fffbeb' },
  requestCardApproved: { borderLeft: '4px solid #34d399', background: '#f0fdf4' },
  requestCardDeclined: { borderLeft: '4px solid #f87171', background: '#fef2f2' },
  requestPhoto: { width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  requestPhotoPlaceholder: { width: '48px', height: '48px', borderRadius: '50%', background: '#e5e7eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  requestInfo: { flex: 1 },
  requestName: { fontWeight: 'bold', color: '#1f2937', margin: '0 0 4px 0', fontSize: '1.125rem' },
  requestSkill: { fontSize: '0.875rem', color: '#6b7280', marginBottom: '8px', textTransform: 'capitalize' },
  requestBio: { fontSize: '0.875rem', color: '#374151', marginBottom: '8px' },
  requestDate: { fontSize: '0.75rem', color: '#9ca3af' },
  requestActions: { display: 'flex', gap: '8px', flexDirection: 'column', flexShrink: 0 },
  approveBtn: { padding: '8px 16px', background: '#16a34a', color: '#ffffff', border: 'none', fontWeight: 'bold', fontSize: '0.875rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' },
  declineBtn: { padding: '8px 16px', background: '#dc2626', color: '#ffffff', border: 'none', fontWeight: 'bold', fontSize: '0.875rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' },
  statusText: { padding: '8px 12px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 'bold', textAlign: 'center' },
  statusApproved: { background: '#16a34a', color: '#ffffff' },
  statusDeclined: { background: '#dc2626', color: '#ffffff' },
  joinSection: { borderTop: '1px solid #e5e7eb', paddingTop: '24px', marginTop: '24px' },
  joinTitle: { fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', marginBottom: '16px', margin: '0 0 16px 0' },
  infoBox: { borderRadius: '8px', padding: '16px', border: '1px solid #e5e7eb' },
  infoPending: { background: '#fef3c7', border: '1px solid #fcd34d' },
  infoApproved: { background: '#d1fae5', border: '1px solid #a7f3d0' },
  infoDeclined: { background: '#fee2e2', border: '1px solid #fecaca' },
  infoSignIn: { background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' },
  joinButton: { color: '#ffffff', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, transition: 'all 0.2s', border: 'none', cursor: 'pointer', fontSize: '1rem' },
  loadingSpinner: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px' },
  spinner: { width: '32px', height: '32px', borderRadius: '50%', border: '4px solid #e5e7eb', borderTopColor: '#0369a1', animation: 'spin 0.8s linear infinite' },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '16px', borderRadius: '8px' },
  noRequestsText: { color: '#6b7280' },
  approvedCrewSection: { borderTop: '1px solid #e5e7eb', paddingTop: '24px', marginTop: '24px' },
  crewMemberLine: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f3f4f6' },
  crewPhoto: { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  crewPhotoPlaceholder: { width: '40px', height: '40px', borderRadius: '50%', background: '#e5e7eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' },
  crewNameLink: { textDecoration: 'none', color: '#0369a1', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' },
  crewGender: { color: '#6b7280', fontSize: '0.875rem', marginLeft: 'auto' },
  chatSection: { borderTop: '1px solid #e5e7eb', paddingTop: '24px', marginTop: '24px' },
  chatMessages: { background: '#f9fafb', borderRadius: '8px', padding: '16px', height: '300px', overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  chatMessage: { padding: '12px 16px', borderRadius: '8px', maxWidth: '80%' },
  chatMessageOwn: { background: '#06b6d4', color: '#ffffff', alignSelf: 'flex-end' },
  chatMessageOther: { background: '#e5e7eb', color: '#1f2937' },
  chatMessageAuthor: { fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', opacity: 0.8 },
  chatMessageText: { fontSize: '0.95rem', lineHeight: '1.4' },
  chatInput: { display: 'flex', gap: '8px' },
  chatTextarea: { flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical', minHeight: '60px' },
  chatSendBtn: { padding: '12px 16px', background: '#06b6d4', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', alignSelf: 'flex-end' },
  calendarLink: { display: 'inline-block', fontSize: '0.9rem', fontWeight: 600, color: '#06b6d4', textDecoration: 'none', padding: '8px 12px', background: '#e0f2fe', borderRadius: '6px', marginTop: '12px' },
};

export default function OutingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [outing, setOuting] = useState(null);
  const [skipper, setSkipper] = useState(null);
  const [boat, setBoat] = useState(null);
  const [crewRequest, setCrewRequest] = useState(null);
  const [crewRequests, setCrewRequests] = useState([]);
  const [approvedCrew, setApprovedCrew] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    const fetchOutingDetails = async () => {
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

          if (user.id === outingData.skipper_id) {
            const { data: allRequests } = await supabase
              .from('crew_requests')
              .select(`*, crew:crew_id (id, full_name, photo_url, bio, sailing_experience, gender)`)
              .eq('outing_id', id)
              .order('requested_at', { ascending: true });

            setCrewRequests(allRequests || []);
          }
        }

        const { data: approved } = await supabase
          .from('crew_requests')
          .select(`*, crew:crew_id (id, full_name, photo_url, sailing_experience, gender)`)
          .eq('outing_id', id)
          .eq('status', 'approved');
        setApprovedCrew(approved || []);

        const { data: msgs } = await supabase
          .from('event_chat')
          .select(`*, user:user_id (id, full_name, photo_url)`)
          .eq('outing_id', id)
          .order('created_at', { ascending: true });
        setMessages(msgs || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOutingDetails();
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !user) return;

    try {
      setSendingMessage(true);
      const { data: newMsg, error } = await supabase
        .from('event_chat')
        .insert([{ outing_id: id, user_id: user.id, message: messageText }])
        .select(`*, user:user_id (id, full_name, photo_url)`)
        .single();

      if (error) throw error;
      setMessages([...messages, newMsg]);
      setMessageText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteOuting = async () => {
    if (!window.confirm('Are you sure you want to delete this outing? This cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('outings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to delete outing');
      setLoading(false);
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
      <div style={styles.loadingSpinner}>
        <div style={styles.spinner} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !outing || !skipper || !boat) {
    return <div style={styles.errorBox}>{error || 'Outing not found'}</div>;
  }

  const isSkipper = user && user.id === outing.skipper_id;
  const statusColors = {
    approved: { bg: '#d1fae5', text: '#065f46' },
    pending: { bg: '#fef3c7', text: '#92400e' },
    declined: { bg: '#fee2e2', text: '#991b1b' },
  };

  return (
    <div style={styles.container}>
      <button
        onClick={() => navigate('/')}
        style={styles.backButton}
        onMouseEnter={(e) => e.target.style.background = '#bfdbfe'}
        onMouseLeave={(e) => e.target.style.background = '#e0f2fe'}
      >
        ← Back to Outings
      </button>

      <div style={styles.mainCard}>
        <div style={styles.header}>
          <h1 style={styles.title}>{outing.title}</h1>
          <span style={{ ...styles.statusBadge, background: statusColors[outing.status]?.bg, color: statusColors[outing.status]?.text }}>
            {outing.status}
          </span>
        </div>

        {isSkipper && (
          <div style={{marginBottom: '24px'}}>
            <button
              onClick={handleDeleteOuting}
              style={{background: '#dc2626', color: '#ffffff', padding: '12px 16px', borderRadius: '8px', fontSize: '1rem', fontWeight: 900, border: 'none', cursor: 'pointer', transition: 'all 0.2s'}}
              onMouseEnter={(e) => e.target.style.background = '#b91c1c'}
              onMouseLeave={(e) => e.target.style.background = '#dc2626'}
            >
              🗑️ Delete Outing
            </button>
          </div>
        )}

        <div style={styles.grid}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Outing Details</h2>
            <div style={styles.section}>
              <div>
                <p style={styles.detailLabel}>Date & Time</p>
                <p style={styles.detailValue}>
                  {new Date(outing.outing_date).toLocaleDateString()} at {outing.outing_time}
                </p>
              </div>

              <div>
                <p style={styles.detailLabel}>Crew Spots Available</p>
                <p style={styles.detailValue}>{outing.capacity_available} available</p>
              </div>

              <div>
                <p style={styles.detailLabel}>Description</p>
                <p style={{ ...styles.detailValue, lineHeight: '1.6' }}>{outing.description}</p>
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <div>
              <h2 style={styles.sectionTitle}>Boat Information</h2>
              <div style={styles.section}>
                <div>
                  <p style={styles.detailLabel}>Boat Name</p>
                  <p style={styles.detailValue}>{boat.name}</p>
                </div>

                <div>
                  <p style={styles.detailLabel}>Size</p>
                  <p style={styles.detailValue}>{boat.size_ft} ft</p>
                </div>

                <div>
                  <p style={styles.detailLabel}>Total Capacity</p>
                  <p style={styles.detailValue}>{boat.capacity} people</p>
                </div>

                {boat.mooring_location && (
                  <div>
                    <p style={styles.detailLabel}>Mooring Location</p>
                    <p style={styles.detailValue}>{boat.mooring_location}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 style={styles.sectionTitle}>Skipper</h2>
              <div style={styles.skipperCard}>
                {skipper.photo_url ? (
                  <img src={skipper.photo_url} alt={skipper.full_name} style={styles.skipperPhoto} />
                ) : (
                  <div style={styles.skipperPhotoPlaceholder}>📷</div>
                )}
                <p style={styles.skipperName}>{skipper.full_name}</p>
                <p style={{ ...styles.skipperSkill, margin: 0 }}>{skipper.sailing_experience} sailor</p>
                {skipper.bio && <p style={styles.skipperBio}>{skipper.bio}</p>}
              </div>
            </div>
            <a href={generateCalendarLink(outing)} target="_blank" rel="noopener noreferrer" style={styles.calendarLink}>
              📅 Add to Calendar
            </a>
          </div>
        </div>

        {/* Approved Crew & Chat Section (show if approved, or skipper, or crew exists) */}
        {(crewRequest?.status === 'approved' || isSkipper || approvedCrew.length > 0) && (
          <>
            {/* Approved Crew List */}
            {approvedCrew.length > 0 && (
              <div style={styles.approvedCrewSection}>
                <h2 style={styles.sectionTitle}>⛵ Crew Confirmed ({approvedCrew.length})</h2>
                <div>
                  {approvedCrew.map((req) => (
                    <div key={req.id} style={styles.crewMemberLine}>
                      {req.crew?.photo_url ? (
                        <img src={req.crew.photo_url} alt={req.crew.full_name} style={styles.crewPhoto} />
                      ) : (
                        <div style={styles.crewPhotoPlaceholder}>👤</div>
                      )}
                      <a
                        href={`/profile/${req.crew_id}`}
                        style={styles.crewNameLink}
                        onClick={(e) => { e.preventDefault(); navigate(`/profile/${req.crew_id}`); }}
                      >
                        {req.crew?.full_name}
                      </a>
                      <span style={styles.crewGender}>({req.crew?.gender})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Group Chat */}
            {(crewRequest?.status === 'approved' || isSkipper) && (
              <div style={styles.chatSection}>
                <h2 style={styles.sectionTitle}>💬 Group Chat</h2>
                <div style={styles.chatMessages}>
                  {messages.length === 0 ? (
                    <div style={{color: '#9ca3af', textAlign: 'center', margin: 'auto'}}>No messages yet. Start the conversation!</div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          ...styles.chatMessage,
                          ...(msg.user_id === user?.id ? styles.chatMessageOwn : styles.chatMessageOther),
                        }}
                      >
                        {msg.user_id !== user?.id && (
                          <div style={styles.chatMessageAuthor}>{msg.user?.full_name}</div>
                        )}
                        <div style={styles.chatMessageText}>{msg.message}</div>
                        <div style={{fontSize: '0.7rem', opacity: 0.6, marginTop: '4px'}}>
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleSendMessage} style={styles.chatInput}>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Message the crew..."
                    style={styles.chatTextarea}
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !messageText.trim()}
                    style={{...styles.chatSendBtn, opacity: sendingMessage || !messageText.trim() ? 0.5 : 1}}
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </>
        )}

        {isSkipper && (
          <div style={styles.crewRequestsSection}>
            <h2 style={styles.crewRequestsTitle}>Crew Requests ({crewRequests.length})</h2>

            {crewRequests.length === 0 ? (
              <p style={styles.noRequestsText}>No crew requests yet</p>
            ) : (
              <div style={styles.requestsList}>
                {crewRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      ...styles.requestCard,
                      ...(req.status === 'pending' ? styles.requestCardPending : req.status === 'approved' ? styles.requestCardApproved : styles.requestCardDeclined),
                    }}
                  >
                    {req.crew?.photo_url ? (
                      <img src={req.crew.photo_url} alt={req.crew.full_name} style={styles.requestPhoto} />
                    ) : (
                      <div style={styles.requestPhotoPlaceholder}>📷</div>
                    )}
                    <div style={styles.requestInfo}>
                      <p style={styles.requestName}>{req.crew?.full_name}</p>
                      <p style={styles.requestSkill}>{req.crew?.sailing_experience} sailor</p>
                      {req.crew?.bio && <p style={styles.requestBio}>{req.crew.bio}</p>}
                      <p style={styles.requestDate}>Requested: {new Date(req.requested_at).toLocaleDateString()}</p>
                    </div>
                    <div style={styles.requestActions}>
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveRequest(req.id)}
                            disabled={actionLoading[req.id]}
                            style={{ ...styles.approveBtn, opacity: actionLoading[req.id] ? 0.6 : 1 }}
                            onMouseEnter={(e) => !actionLoading[req.id] && (e.target.style.background = '#15803d')}
                            onMouseLeave={(e) => (e.target.style.background = '#16a34a')}
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(req.id)}
                            disabled={actionLoading[req.id]}
                            style={{ ...styles.declineBtn, opacity: actionLoading[req.id] ? 0.6 : 1 }}
                            onMouseEnter={(e) => !actionLoading[req.id] && (e.target.style.background = '#b91c1c')}
                            onMouseLeave={(e) => (e.target.style.background = '#dc2626')}
                          >
                            ✗ Decline
                          </button>
                        </>
                      )}
                      {req.status !== 'pending' && (
                        <p style={{ ...styles.statusText, ...(req.status === 'approved' ? styles.statusApproved : styles.statusDeclined) }}>
                          {req.status === 'approved' ? 'Approved' : 'Declined'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isSkipper && (
          <div style={styles.joinSection}>
            <h2 style={styles.joinTitle}>Join This Outing</h2>

            {!user ? (
              <div style={{ ...styles.infoBox, ...styles.infoSignIn }}>
                <p>Sign in to request to join this outing</p>
              </div>
            ) : crewRequest ? (
              <div style={{ ...styles.infoBox, ...(crewRequest.status === 'pending' ? styles.infoPending : crewRequest.status === 'approved' ? styles.infoApproved : styles.infoDeclined) }}>
                <p style={{ fontWeight: 600, marginBottom: '8px', textTransform: 'capitalize' }}>
                  Request Status: {crewRequest.status}
                </p>
                {crewRequest.status === 'pending' && <p style={{ fontSize: '0.875rem' }}>Waiting for the skipper to review your request</p>}
                {crewRequest.status === 'approved' && <p style={{ fontSize: '0.875rem' }}>Great! You're approved to join this outing</p>}
                {crewRequest.status === 'declined' && <p style={{ fontSize: '0.875rem' }}>Your request was not approved for this outing</p>}
              </div>
            ) : (
              <button
                onClick={handleRequestToJoin}
                disabled={submitting}
                style={{ ...styles.joinButton, background: submitting ? '#9ca3af' : '#06b6d4' }}
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
