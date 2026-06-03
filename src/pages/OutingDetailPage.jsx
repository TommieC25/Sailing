import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { formatLocalDate, isPastLocalDate } from '../utils/dateUtils';

const styles = {
  container: { display: 'grid', gap: '12px' },
  backButton: { background: '#e0f2fe', border: '2px solid #0369a1', color: '#0369a1', fontSize: '1rem', fontWeight: 900, padding: '9px 12px', borderRadius: '8px', marginBottom: '6px', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s' },
  mainCard: { background: '#ffffff', borderRadius: '8px', boxShadow: '0 6px 12px rgba(0,0,0,0.08)', padding: '14px 16px' },
  header: { display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' },
  title: { fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: 0 },
  statusBadge: { display: 'inline-block', padding: '5px 9px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', width: 'fit-content' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' },
  section: { display: 'grid', gap: '12px' },
  sectionTitle: { fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: 0 },
  detailLabel: { fontSize: '0.82rem', color: '#6b7280', margin: '0 0 3px 0' },
  detailValue: { fontSize: '1rem', fontWeight: 500, color: '#1f2937', margin: 0 },
  skipperCard: { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' },
  skipperPhoto: { width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px' },
  skipperPhotoPlaceholder: { width: '64px', height: '64px', borderRadius: '50%', background: '#e5e7eb', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' },
  skipperName: { fontWeight: 600, color: '#1f2937', margin: '0 0 4px 0' },
  skipperSkill: { fontSize: '0.875rem', color: '#6b7280', marginBottom: '8px', textTransform: 'capitalize' },
  skipperBio: { fontSize: '0.875rem', color: '#374151', marginTop: '8px' },
  crewRequestsSection: { borderTop: '1px solid #e5e7eb', paddingTop: '14px', marginTop: '14px' },
  crewRequestsTitle: { fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '12px', margin: '0 0 12px 0' },
  requestsList: { display: 'grid', gap: '10px' },
  requestCard: { borderRadius: '8px', padding: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' },
  requestCardPending: { borderLeft: '4px solid #fbbf24', background: '#fffbeb' },
  requestCardApproved: { borderLeft: '4px solid #34d399', background: '#f0fdf4' },
  requestCardDeclined: { borderLeft: '4px solid #f87171', background: '#fef2f2' },
  requestCardWaitlisted: { borderLeft: '4px solid #38bdf8', background: '#f0f9ff' },
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
  statusWaitlisted: { background: '#0284c7', color: '#ffffff' },
  joinSection: { borderTop: '1px solid #e5e7eb', paddingTop: '14px', marginTop: '14px' },
  joinTitle: { fontSize: '1.15rem', fontWeight: 600, color: '#1f2937', marginBottom: '12px', margin: '0 0 12px 0' },
  joinNote: { background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px', padding: '10px 12px', margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.35 },
  infoBox: { borderRadius: '8px', padding: '12px', border: '1px solid #e5e7eb' },
  infoPending: { background: '#fef3c7', border: '1px solid #fcd34d' },
  infoApproved: { background: '#d1fae5', border: '1px solid #a7f3d0' },
  infoDeclined: { background: '#fee2e2', border: '1px solid #fecaca' },
  infoWaitlisted: { background: '#e0f2fe', border: '1px solid #7dd3fc' },
  infoSignIn: { background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' },
  joinButton: { color: '#ffffff', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, transition: 'all 0.2s', border: 'none', cursor: 'pointer', fontSize: '0.95rem' },
  loadingSpinner: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px' },
  spinner: { width: '32px', height: '32px', borderRadius: '50%', border: '4px solid #e5e7eb', borderTopColor: '#0369a1', animation: 'spin 0.8s linear infinite' },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '16px', borderRadius: '8px' },
  noRequestsText: { color: '#6b7280' },
  approvedCrewSection: { borderTop: '1px solid #e5e7eb', paddingTop: '14px', marginTop: '14px' },
  crewMemberLine: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f3f4f6' },
  crewPhoto: { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  crewPhotoPlaceholder: { width: '40px', height: '40px', borderRadius: '50%', background: '#e5e7eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' },
  crewNameLink: { textDecoration: 'none', color: '#0369a1', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' },
  profileLinkButton: { background: 'none', border: 'none', padding: 0, color: '#0369a1', fontWeight: 900, cursor: 'pointer', fontSize: '1rem', textAlign: 'left' },
  crewMemberInfo: { flex: 1, minWidth: 0, display: 'grid', gap: '2px' },
  crewMeta: { color: '#64748b', fontSize: '0.82rem', lineHeight: 1.3 },
  messageBtn: { background: '#0c2340', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 10px', fontWeight: 900, cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 },
  chatSection: { borderTop: '1px solid #e5e7eb', paddingTop: '14px', marginTop: '14px' },
  chatMessages: { background: '#f9fafb', borderRadius: '8px', padding: '10px', maxHeight: '220px', overflowY: 'auto', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' },
  chatMessage: { padding: '9px 12px', borderRadius: '8px', maxWidth: '80%' },
  chatMessageOwn: { background: '#06b6d4', color: '#ffffff', alignSelf: 'flex-end' },
  chatMessageOther: { background: '#e5e7eb', color: '#1f2937' },
  chatMessageAuthor: { fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', opacity: 0.8 },
  chatAuthorButton: { background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', fontWeight: 900, cursor: 'pointer', textAlign: 'left', textDecoration: 'underline' },
  chatMessageText: { fontSize: '0.95rem', lineHeight: '1.4', whiteSpace: 'pre-wrap' },
  chatInput: { display: 'flex', gap: '8px' },
  chatTextarea: { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical', minHeight: '48px' },
  chatSendBtn: { padding: '10px 14px', background: '#06b6d4', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', alignSelf: 'flex-end' },
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
  const [approvedCrewCount, setApprovedCrewCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const refreshRequestNotifications = () => {
    window.dispatchEvent(new Event('sailing:crew-requests-updated'));
    window.dispatchEvent(new Event('sailing:outing-requests-updated'));
  };

  const statusUpdatePayload = (status, note = null) => {
    const now = new Date().toISOString();
    const payload = {
      status,
      responded_at: now,
      status_changed_at: now,
      status_seen_at: null,
    };

    if (status === 'declined') {
      payload.skipper_response_note = note || null;
    }

    return payload;
  };

  const canApproveRequest = (requestId) => {
    const crewLimit = Number(outing?.capacity_available || 0);
    const request = crewRequests.find((item) => item.id === requestId);
    if (request?.status === 'approved') return true;
    return crewLimit < 1 || approvedCrewCount < crewLimit;
  };

  useEffect(() => {
    const fetchOutingDetails = async () => {
      try {
        const { data: outingData, error: outingError } = await supabase
          .from('outings')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (outingError) throw outingError;
        if (!outingData) throw new Error('Outing not found');
        setOuting(outingData);

        const { data: skipperData, error: skipperError } = await supabase
          .from('public_profiles')
          .select('id, full_name, photo_url, bio, sailing_experience')
          .eq('id', outingData.skipper_id)
          .maybeSingle();

        if (skipperError) throw skipperError;
        setSkipper(skipperData || {
          id: outingData.skipper_id,
          full_name: 'Skipper profile unavailable',
        });

        const { data: boatData, error: boatError } = await supabase
          .from('boats')
          .select('*')
          .eq('id', outingData.boat_id)
          .maybeSingle();

        if (boatError) throw boatError;
        setBoat(boatData || {
          id: outingData.boat_id,
          name: 'Boat details unavailable',
          size_ft: null,
          capacity: null,
        });

        let currentUserRequestData = null;
        if (user) {
          const { data: requestData, error: requestError } = await supabase
            .from('crew_requests')
            .select('*')
            .eq('outing_id', id)
            .eq('crew_id', user.id)
            .order('requested_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (requestError) throw requestError;
          currentUserRequestData = requestData || null;
          setCrewRequest(requestData || null);

          if (user.id === outingData.skipper_id) {
            const { data: allRequests, error: requestsError } = await supabase
              .from('crew_requests')
              .select('*')
              .eq('outing_id', id)
              .order('requested_at', { ascending: true });

            if (requestsError) throw requestsError;

            const crewIds = [...new Set((allRequests || []).map((request) => request.crew_id).filter(Boolean))];
            const { data: crewProfiles, error: crewProfilesError } = crewIds.length
              ? await supabase
                  .from('public_profiles')
                  .select('id, full_name, photo_url, bio, sailing_experience, gender')
                  .in('id', crewIds)
              : { data: [], error: null };

            if (crewProfilesError) throw crewProfilesError;

            const crewById = Object.fromEntries((crewProfiles || []).map((crew) => [crew.id, crew]));
            setCrewRequests((allRequests || []).map((request) => ({
              ...request,
              crew: crewById[request.crew_id] || null,
            })));
          }
        }

        const { data: approved, error: approvedError } = await supabase
          .from('crew_requests')
          .select('*')
          .eq('outing_id', id)
          .eq('status', 'approved');

        if (approvedError) throw approvedError;

        const { data: approvedCounts, error: approvedCountsError } = await supabase
          .rpc('outing_approved_counts', { p_outing_ids: [id] });

        if (approvedCountsError) {
          console.warn('Could not load approved crew count:', approvedCountsError.message);
          setApprovedCrewCount((approved || []).length);
        } else {
          setApprovedCrewCount(approvedCounts?.[0]?.approved_count || 0);
        }

        const approvedCrewIds = [...new Set((approved || []).map((request) => request.crew_id).filter(Boolean))];
        const { data: approvedProfiles, error: approvedProfilesError } = approvedCrewIds.length
          ? await supabase
              .from('public_profiles')
              .select('id, full_name, photo_url, sailing_experience, gender')
              .in('id', approvedCrewIds)
          : { data: [], error: null };

        if (approvedProfilesError) throw approvedProfilesError;

        const approvedById = Object.fromEntries((approvedProfiles || []).map((crew) => [crew.id, crew]));
        setApprovedCrew((approved || []).map((request) => ({
          ...request,
          crew: approvedById[request.crew_id] || null,
        })));

        const currentUserRequest = user
          ? user.id === outingData.skipper_id
            ? null
            : currentUserRequestData
          : null;
        const canViewChat = user && (
          user.id === outingData.skipper_id
          || currentUserRequest?.status === 'approved'
        );

        const { data: msgs, error: msgsError } = canViewChat
          ? await supabase
              .from('event_chat')
              .select('*')
              .eq('outing_id', id)
              .order('created_at', { ascending: true })
          : { data: [], error: null };

        if (msgsError) throw msgsError;

        const messageUserIds = [...new Set((msgs || []).map((msg) => msg.user_id).filter(Boolean))];
        const { data: messageUsers, error: messageUsersError } = messageUserIds.length
          ? await supabase
              .from('public_profiles')
              .select('id, full_name, photo_url')
              .in('id', messageUserIds)
          : { data: [], error: null };

        if (messageUsersError) throw messageUsersError;

        const messageUserById = Object.fromEntries((messageUsers || []).map((msgUser) => [msgUser.id, msgUser]));
        setMessages((msgs || []).map((msg) => ({
          ...msg,
          user: messageUserById[msg.user_id] || null,
        })));
      } catch (err) {
        setError(err.message || 'Could not load outing details');
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
      setError(err.message || 'Failed to submit crew request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [requestId]: true }));
      setError('');
      if (!canApproveRequest(requestId)) {
        throw new Error('This outing is already full. Decline the request or keep the member waitlisted until space opens.');
      }
      const payload = statusUpdatePayload('approved');
      const { error } = await supabase
        .from('crew_requests')
        .update(payload)
        .eq('id', requestId);

      if (error) throw error;
      const approvedRequest = crewRequests.find((req) => req.id === requestId);
      setCrewRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, ...payload } : req
        )
      );
      if (approvedRequest) {
        setApprovedCrew((prev) => {
          if (prev.some((req) => req.id === requestId)) return prev;
          return [...prev, { ...approvedRequest, ...payload }];
        });
      }
      if (approvedRequest?.status !== 'approved') {
        setApprovedCrewCount((current) => current + 1);
      }
      refreshRequestNotifications();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleDeclineRequest = async (requestId) => {
    const note = window.prompt('Optional note to the member about this decision:', '');
    if (note === null) return;

    try {
      setActionLoading((prev) => ({ ...prev, [requestId]: true }));
      const payload = statusUpdatePayload('declined', note.trim());
      const { error } = await supabase
        .from('crew_requests')
        .update(payload)
        .eq('id', requestId);

      if (error) throw error;
      setCrewRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, ...payload } : req
        )
      );
      setApprovedCrew((prev) => prev.filter((req) => req.id !== requestId));
      refreshRequestNotifications();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleJoinWaitlist = async () => {
    if (!crewRequest) return;

    try {
      setActionLoading((prev) => ({ ...prev, [crewRequest.id]: true }));
      const { data, error: waitlistError } = await supabase.rpc('join_crew_request_waitlist', {
        p_request_id: crewRequest.id,
      });

      if (waitlistError) throw waitlistError;
      const updated = Array.isArray(data) ? data[0] : data;
      setCrewRequest((prev) => ({ ...prev, ...updated }));
      refreshRequestNotifications();
    } catch (err) {
      setError(err.message || 'Could not join waitlist');
    } finally {
      setActionLoading((prev) => ({ ...prev, [crewRequest.id]: false }));
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
        .select('*')
        .single();

      if (error) throw error;
      setMessages([...messages, { ...newMsg, user: profile }]);
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
  const isArchived = isPastLocalDate(outing.outing_date);
  const statusColors = {
    open: { bg: '#dbeafe', text: '#1e40af' },
    archived: { bg: '#e2e8f0', text: '#475569' },
    approved: { bg: '#d1fae5', text: '#065f46' },
    pending: { bg: '#fef3c7', text: '#92400e' },
    declined: { bg: '#fee2e2', text: '#991b1b' },
    waitlisted: { bg: '#e0f2fe', text: '#075985' },
  };
  const displayStatus = isArchived ? 'archived' : outing.status;
  const pendingRequests = crewRequests.filter((request) => request.status === 'pending');
  const approvedRequests = crewRequests.filter((request) => request.status === 'approved');
  const waitlistedRequests = crewRequests.filter((request) => request.status === 'waitlisted');
  const declinedRequests = crewRequests.filter((request) => request.status === 'declined');
  const requestCardStyle = (status) => ({
    ...styles.requestCard,
    ...(status === 'pending'
      ? styles.requestCardPending
      : status === 'approved'
        ? styles.requestCardApproved
        : status === 'waitlisted'
          ? styles.requestCardWaitlisted
          : styles.requestCardDeclined),
  });
  const requestStatusStyle = (status) => ({
    ...styles.statusText,
    ...(status === 'approved'
      ? styles.statusApproved
      : status === 'waitlisted'
        ? styles.statusWaitlisted
        : styles.statusDeclined),
  });
  const boatFacts = [
    boat.name || 'Boat details unavailable',
    boat.size_ft ? `${boat.size_ft}'` : null,
    boat.mooring_location || null,
  ].filter(Boolean);
  const crewCapacity = Number(outing.capacity_available || 0);
  const crewSpotsRemaining = Math.max(crewCapacity - approvedCrewCount, 0);
  const renderSkipperRequest = (req) => (
    <div key={req.id} style={requestCardStyle(req.status)}>
      {req.crew?.photo_url ? (
        <img src={req.crew.photo_url} alt={req.crew.full_name} style={styles.requestPhoto} />
      ) : (
        <div style={styles.requestPhotoPlaceholder}>📷</div>
      )}
      <div style={styles.requestInfo}>
        <button
          type="button"
          onClick={() => navigate(`/profile/${req.crew_id}?returnTo=${encodeURIComponent(`/outing/${id}`)}`)}
          style={styles.profileLinkButton}
        >
          {req.crew?.full_name || 'View profile'}
        </button>
        <p style={styles.requestSkill}>{req.crew?.sailing_experience || 'Experience not listed'} sailor</p>
        {req.crew?.bio && <p style={styles.requestBio}>{req.crew.bio}</p>}
        {req.skipper_response_note && <p style={styles.requestBio}>Note: {req.skipper_response_note}</p>}
        <p style={styles.requestDate}>Requested: {new Date(req.requested_at).toLocaleDateString()}</p>
      </div>
      <div style={styles.requestActions}>
        {(req.status === 'pending' || req.status === 'waitlisted') && (
          <button
            onClick={() => handleApproveRequest(req.id)}
            disabled={actionLoading[req.id]}
            style={{ ...styles.approveBtn, opacity: actionLoading[req.id] ? 0.6 : 1 }}
            onMouseEnter={(e) => !actionLoading[req.id] && (e.target.style.background = '#15803d')}
            onMouseLeave={(e) => (e.target.style.background = '#16a34a')}
          >
            {req.status === 'waitlisted' ? '✓ Approve from Waitlist' : '✓ Approve'}
          </button>
        )}
        {req.status === 'pending' && (
          <button
            onClick={() => handleDeclineRequest(req.id)}
            disabled={actionLoading[req.id]}
            style={{ ...styles.declineBtn, opacity: actionLoading[req.id] ? 0.6 : 1 }}
            onMouseEnter={(e) => !actionLoading[req.id] && (e.target.style.background = '#b91c1c')}
            onMouseLeave={(e) => (e.target.style.background = '#dc2626')}
          >
            ✗ Decline
          </button>
        )}
        {req.status !== 'pending' && req.status !== 'waitlisted' && (
          <p style={requestStatusStyle(req.status)}>
            {req.status === 'approved' ? 'Approved' : 'Declined'}
          </p>
        )}
      </div>
    </div>
  );

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
          <span style={{ ...styles.statusBadge, background: statusColors[displayStatus]?.bg, color: statusColors[displayStatus]?.text }}>
            {displayStatus}
          </span>
        </div>

        {isSkipper && (
          <div style={{marginBottom: '10px'}}>
            <button
              onClick={handleDeleteOuting}
              style={{background: '#dc2626', color: '#ffffff', padding: '9px 12px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 900, border: 'none', cursor: 'pointer', transition: 'all 0.2s'}}
              onMouseEnter={(e) => e.target.style.background = '#b91c1c'}
              onMouseLeave={(e) => e.target.style.background = '#dc2626'}
            >
              🗑️ Delete Outing
            </button>
          </div>
        )}

        {/* Key Info */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px', marginBottom: '12px'}}>
          <div>
            <p style={styles.detailLabel}>📍 Location</p>
            <p style={{...styles.detailValue, fontSize: '1.1rem', color: '#0c2340'}}>{outing.location}</p>
          </div>

          <div>
            <p style={styles.detailLabel}>📅 Date & Time</p>
            <p style={styles.detailValue}>
              {formatLocalDate(outing.outing_date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {outing.outing_time}
            </p>
          </div>

          <div>
            <p style={styles.detailLabel}>👥 Crew Spots Available</p>
            <p style={styles.detailValue}>
              {crewSpotsRemaining} of {crewCapacity} spot{crewCapacity !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>

        {/* Boat Information */}
        <div style={{background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '9px 12px', marginBottom: '12px'}}>
          <p style={{fontSize: '1rem', fontWeight: 900, color: '#0c2340', margin: 0}}>
            🚢 {boatFacts.join(' / ')}
          </p>
        </div>

        {/* Skipper */}
        <button
          type="button"
          onClick={() => navigate(`/profile/${outing.skipper_id}?returnTo=${encodeURIComponent(`/outing/${id}`)}`)}
          style={{background: '#ffffff', border: '2px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px', display: 'flex', gap: '12px', alignItems: 'center', width: '100%', textAlign: 'left', cursor: 'pointer'}}
        >
          {skipper?.photo_url ? (
            <img src={skipper.photo_url} alt={skipper.full_name} style={{width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0}} />
          ) : (
            <div style={{width: '52px', height: '52px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0}}>👤</div>
          )}
          <div>
            <p style={{fontSize: '1rem', fontWeight: 900, color: '#1e293b', margin: '0 0 2px 0'}}>⛵ Skipper</p>
            <p style={{fontSize: '1rem', color: '#1e293b', fontWeight: 600, margin: '0 0 2px 0'}}>{skipper?.full_name}</p>
            {skipper?.sailing_experience && (
              <p style={{fontSize: '0.875rem', color: '#64748b', margin: 0, textTransform: 'capitalize'}}>{skipper.sailing_experience} sailor</p>
            )}
            {skipper?.bio && <p style={{fontSize: '0.875rem', color: '#475569', margin: '6px 0 0 0'}}>{skipper.bio}</p>}
          </div>
        </button>

        {/* Description */}
        {outing.description && (
          <div style={{background: '#ffffff', border: '2px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px'}}>
            <p style={{fontSize: '1rem', fontWeight: 900, color: '#1e293b', margin: '0 0 8px 0', paddingBottom: '8px', borderBottom: '2px solid #e0f2fe'}}>ℹ️ About This Outing</p>
            <p style={{fontSize: '0.95rem', color: '#475569', lineHeight: '1.45', margin: 0}}>{outing.description}</p>
          </div>
        )}

        {/* Crew Requests Section */}

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
                      <div style={styles.crewMemberInfo}>
                        <button
                          type="button"
                          style={styles.profileLinkButton}
                          onClick={() => navigate(`/profile/${req.crew_id}?returnTo=${encodeURIComponent(`/outing/${id}`)}`)}
                        >
                          {req.crew?.full_name || 'View profile'}
                        </button>
                        <span style={styles.crewMeta}>
                          Approved {new Date(req.responded_at || req.requested_at).toLocaleString()}
                        </span>
                        <span style={styles.crewMeta}>
                          {req.crew?.sailing_experience ? `${req.crew.sailing_experience} sailor` : 'Sailing experience not listed'}
                          {req.crew?.gender ? ` • ${req.crew.gender}` : ''}
                        </span>
                      </div>
                      {user?.id !== req.crew_id && (
                        <button
                          type="button"
                          style={styles.messageBtn}
                          onClick={() => navigate(`/messages/${req.crew_id}?returnTo=${encodeURIComponent(`/outing/${id}`)}`)}
                        >
                          Message
                        </button>
                      )}
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
                          <div style={styles.chatMessageAuthor}>
                            {msg.user_id ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/profile/${msg.user_id}?returnTo=${encodeURIComponent(`/outing/${id}`)}`)}
                                style={styles.chatAuthorButton}
                              >
                                {msg.user?.full_name || 'Member'}
                              </button>
                            ) : (
                              msg.user?.full_name || 'Member'
                            )}
                          </div>
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
                {pendingRequests.length > 0 && (
                  <div style={styles.requestsList}>
                    <h3 style={{...styles.sectionTitle, margin: 0}}>Pending Requests ({pendingRequests.length})</h3>
                    {pendingRequests.map(renderSkipperRequest)}
                  </div>
                )}
                {approvedRequests.length > 0 && (
                  <div style={styles.requestsList}>
                    <h3 style={{...styles.sectionTitle, margin: 0}}>Approved Crew ({approvedRequests.length})</h3>
                    {approvedRequests.map(renderSkipperRequest)}
                  </div>
                )}
                {waitlistedRequests.length > 0 && (
                  <div style={styles.requestsList}>
                    <h3 style={{...styles.sectionTitle, margin: 0}}>Waitlist ({waitlistedRequests.length})</h3>
                    {waitlistedRequests.map(renderSkipperRequest)}
                  </div>
                )}
                {declinedRequests.length > 0 && (
                  <div style={styles.requestsList}>
                    <h3 style={{...styles.sectionTitle, margin: 0}}>Declined / Not Accommodated ({declinedRequests.length})</h3>
                    {declinedRequests.map(renderSkipperRequest)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!isSkipper && crewRequest?.status !== 'approved' && (
          <div style={styles.joinSection}>
            <h2 style={styles.joinTitle}>{crewRequest ? 'Your Outing Request' : 'Join This Outing'}</h2>
            {!crewRequest && !isArchived && (
              <p style={styles.joinNote}>
                Please note: Availability is not guaranteed, subject to Skipper approval and available crew space. You’ll be notified of the status of your request.
              </p>
            )}

            {isArchived ? (
              <div style={{ ...styles.infoBox, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569' }}>
                <p>This outing is archived because its date has passed.</p>
              </div>
            ) : !user ? (
              <div style={{ ...styles.infoBox, ...styles.infoSignIn }}>
                <p>Sign in to request to join this outing</p>
              </div>
            ) : crewRequest ? (
              <div style={{
                ...styles.infoBox,
                ...(crewRequest.status === 'pending'
                  ? styles.infoPending
                  : crewRequest.status === 'approved'
                    ? styles.infoApproved
                    : crewRequest.status === 'waitlisted'
                      ? styles.infoWaitlisted
                      : styles.infoDeclined),
              }}>
                <p style={{ fontWeight: 600, marginBottom: '8px', textTransform: 'capitalize' }}>
                  Request Status: {crewRequest.status === 'waitlisted' ? 'Waitlisted' : crewRequest.status}
                </p>
                {crewRequest.status === 'pending' && <p style={{ fontSize: '0.875rem' }}>Waiting for the skipper to review your request</p>}
                {crewRequest.status === 'approved' && <p style={{ fontSize: '0.875rem' }}>Your request to join {outing.title} has been approved. Have a great time!</p>}
                {crewRequest.status === 'declined' && (
                  <>
                    <p style={{ fontSize: '0.875rem' }}>Unfortunately, your request to join {outing.title} could not be accommodated at this time. You may request to be waitlisted in case space becomes available.</p>
                    {crewRequest.skipper_response_note && <p style={{ fontSize: '0.875rem' }}>Skipper note: {crewRequest.skipper_response_note}</p>}
                    <button
                      type="button"
                      onClick={handleJoinWaitlist}
                      disabled={actionLoading[crewRequest.id]}
                      style={{ ...styles.joinButton, background: '#f59e0b', color: '#111827', marginTop: '10px', opacity: actionLoading[crewRequest.id] ? 0.6 : 1 }}
                    >
                      {actionLoading[crewRequest.id] ? 'Adding...' : 'Join Waitlist'}
                    </button>
                  </>
                )}
                {crewRequest.status === 'waitlisted' && <p style={{ fontSize: '0.875rem' }}>You have been added to the waitlist for {outing.title} and will be notified if a crew spot becomes available.</p>}
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
