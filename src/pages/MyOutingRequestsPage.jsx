import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { formatLocalDate, isPastLocalDate } from '../utils/dateUtils';

const styles = {
  container: { display: 'grid', gap: '12px' },
  header: { background: '#ffffff', border: '1px solid #dbeafe', borderRadius: '8px', padding: '14px 16px', display: 'grid', gap: '4px' },
  title: { fontSize: '1.55rem', fontWeight: 900, color: '#0f172a', margin: 0 },
  subtitle: { color: '#64748b', fontWeight: 600, margin: 0 },
  list: { display: 'grid', gap: '10px' },
  card: { background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '5px solid #94a3b8', borderRadius: '8px', padding: '12px 14px', display: 'grid', gap: '10px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' },
  outingName: { fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0 },
  meta: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '6px 12px', color: '#475569', fontWeight: 600, fontSize: '0.92rem' },
  statusBadge: { borderRadius: '999px', padding: '5px 10px', fontSize: '0.82rem', fontWeight: 900 },
  message: { margin: 0, color: '#334155', lineHeight: 1.4, whiteSpace: 'pre-wrap' },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  button: { border: 'none', borderRadius: '8px', padding: '9px 12px', fontWeight: 900, cursor: 'pointer', fontSize: '0.9rem' },
  inlineLink: { background: 'none', border: 'none', padding: 0, color: '#0369a1', font: 'inherit', fontWeight: 900, cursor: 'pointer', textAlign: 'left' },
  linkBtn: { background: '#0369a1', color: '#ffffff' },
  waitlistBtn: { background: '#f59e0b', color: '#111827' },
  withdrawBtn: { background: '#fee2e2', color: '#991b1b', border: '1px solid #ef4444' },
  success: { background: '#dcfce7', border: '1px solid #86efac', color: '#166534', borderRadius: '8px', padding: '10px 12px', fontWeight: 700 },
  error: { background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', padding: '10px 12px', fontWeight: 700 },
  empty: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', color: '#475569', fontWeight: 700, textAlign: 'center' },
};

const statusDisplay = {
  pending: { label: 'Pending', bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  approved: { label: 'Approved', bg: '#dcfce7', text: '#166534', border: '#22c55e' },
  declined: { label: 'Declined', bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
  waitlisted: { label: 'Waitlisted', bg: '#e0f2fe', text: '#075985', border: '#0ea5e9' },
};

const requestMessage = (request) => {
  const title = request.outings?.title || 'this outing';

  if (request.status === 'approved') {
    return `Your request to join ${title} has been approved. Have a great time!`;
  }

  if (request.status === 'declined') {
    return `Unfortunately, your request to join ${title} could not be accommodated at this time. You may request to be waitlisted in case space becomes available.`;
  }

  if (request.status === 'waitlisted') {
    return `You have been added to the waitlist for ${title} and will be notified if a crew spot becomes available.`;
  }

  return 'Your request is pending skipper review.';
};

export default function MyOutingRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchRequests = useCallback(async ({ markSeen = true, showLoading = false } = {}) => {
    if (!user) return;

    try {
      if (showLoading) setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('crew_requests')
        .select('*, outings(id, title, outing_date, outing_time, skipper_id)')
        .eq('crew_id', user.id)
        .order('requested_at', { ascending: false });

      if (fetchError) throw fetchError;

      const skipperIds = [...new Set((data || []).map((request) => request.outings?.skipper_id).filter(Boolean))];
      const { data: skippers, error: skipperError } = skipperIds.length
        ? await supabase
            .from('public_profiles')
            .select('id, full_name')
            .in('id', skipperIds)
        : { data: [], error: null };

      if (skipperError) throw skipperError;

      const skipperById = Object.fromEntries((skippers || []).map((skipper) => [skipper.id, skipper]));
      setRequests((data || []).map((request) => ({
        ...request,
        skipper: skipperById[request.outings?.skipper_id] || null,
      })));

      if (markSeen) {
        const { error: seenError } = await supabase.rpc('mark_my_crew_requests_seen');
        if (!seenError) {
          window.dispatchEvent(new Event('sailing:outing-requests-updated'));
        } else {
          console.warn('Could not mark outing request statuses seen:', seenError.message);
        }
      }
    } catch (err) {
      setError(err.message || 'Could not load outing requests');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const refreshQuietly = () => fetchRequests({ markSeen: false });
    const initialFetch = window.setTimeout(() => {
      fetchRequests({ showLoading: true });
    }, 0);

    window.addEventListener('focus', refreshQuietly);
    window.addEventListener('pageshow', refreshQuietly);

    const channel = supabase
      .channel(`my-outing-requests-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crew_requests', filter: `crew_id=eq.${user.id}` },
        refreshQuietly
      )
      .subscribe();

    return () => {
      window.clearTimeout(initialFetch);
      window.removeEventListener('focus', refreshQuietly);
      window.removeEventListener('pageshow', refreshQuietly);
      supabase.removeChannel(channel);
    };
  }, [user, fetchRequests]);

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const dateA = `${a.outings?.outing_date || ''} ${a.outings?.outing_time || ''}`;
      const dateB = `${b.outings?.outing_date || ''} ${b.outings?.outing_time || ''}`;
      return dateB.localeCompare(dateA);
    });
  }, [requests]);

  const handleJoinWaitlist = async (request) => {
    try {
      setActionLoading((prev) => ({ ...prev, [request.id]: true }));
      setError('');
      setSuccess('');

      const { data, error: waitlistError } = await supabase.rpc('join_crew_request_waitlist', {
        p_request_id: request.id,
      });

      if (waitlistError) throw waitlistError;

      const updated = Array.isArray(data) ? data[0] : data;
      setRequests((prev) => prev.map((item) => (
        item.id === request.id ? { ...item, ...updated, outings: item.outings, skipper: item.skipper } : item
      )));
      setSuccess(`You have been added to the waitlist for ${request.outings?.title || 'this outing'} and will be notified if a crew spot becomes available.`);
      window.dispatchEvent(new Event('sailing:outing-requests-updated'));
    } catch (err) {
      setError(err.message || 'Could not join waitlist');
    } finally {
      setActionLoading((prev) => ({ ...prev, [request.id]: false }));
    }
  };

  const handleWithdrawRequest = async (request) => {
    const labels = {
      pending: 'Withdraw this request?',
      waitlisted: 'Leave this waitlist?',
      approved: 'Leave this outing? You will lose access to its crew roster and group chat.',
      declined: 'Remove this declined request?',
    };
    if (!window.confirm(labels[request.status] || 'Remove this outing request?')) return;

    try {
      setActionLoading((prev) => ({ ...prev, [request.id]: true }));
      setError('');
      setSuccess('');
      const { error: deleteError } = await supabase
        .from('crew_requests')
        .delete()
        .eq('id', request.id)
        .eq('crew_id', user.id);
      if (deleteError) throw deleteError;
      setRequests((current) => current.filter((item) => item.id !== request.id));
      setSuccess('Outing request removed.');
      window.dispatchEvent(new Event('sailing:crew-requests-updated'));
      window.dispatchEvent(new Event('sailing:outing-requests-updated'));
      window.dispatchEvent(new Event('sailing:event-chat-updated'));
    } catch (err) {
      setError(err.message || 'Could not remove outing request');
    } finally {
      setActionLoading((prev) => ({ ...prev, [request.id]: false }));
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>My Outing Requests</h1>
        <p style={styles.subtitle}>Track requests to join outings and respond when waitlist options are available.</p>
      </div>

      {success && <div style={styles.success}>{success}</div>}
      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.empty}>Loading outing requests...</div>
      ) : sortedRequests.length === 0 ? (
        <div style={styles.empty}>You have not requested to join any outings yet.</div>
      ) : (
        <div style={styles.list}>
          {sortedRequests.map((request) => {
            const status = statusDisplay[request.status] || statusDisplay.pending;
            const isArchived = !request.outings?.outing_date || isPastLocalDate(request.outings.outing_date);
            const withdrawLabels = {
              pending: 'Withdraw Request',
              waitlisted: 'Leave Waitlist',
              approved: 'Leave Outing',
              declined: 'Remove Request',
            };
            return (
              <div key={request.id} style={{ ...styles.card, borderLeftColor: status.border }}>
                <div style={styles.cardHeader}>
                  <h2 style={styles.outingName}>{request.outings?.title || 'Outing unavailable'}</h2>
                  <span style={{ ...styles.statusBadge, background: status.bg, color: status.text }}>
                    {status.label}
                  </span>
                </div>

                <div style={styles.meta}>
                  <span>📅 {request.outings?.outing_date ? formatLocalDate(request.outings.outing_date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unavailable'}</span>
                  <span>⏱️ {request.outings?.outing_time || 'Time unavailable'}</span>
                  <span>
                    ⛵ {request.skipper?.id ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/profile/${request.skipper.id}?returnTo=${encodeURIComponent('/my-outing-requests')}`)}
                        style={styles.inlineLink}
                      >
                        {request.skipper.full_name || 'Skipper profile'}
                      </button>
                    ) : (
                      'Skipper unavailable'
                    )}
                  </span>
                </div>

                <p style={styles.message}>{requestMessage(request)}</p>
                {request.skipper_response_note && (
                  <p style={styles.message}>Skipper note: {request.skipper_response_note}</p>
                )}

                <div style={styles.actions}>
                  {request.outing_id && (
                    <button
                      type="button"
                      onClick={() => navigate(`/outing/${request.outing_id}?returnTo=${encodeURIComponent('/my-outing-requests')}`)}
                      style={{ ...styles.button, ...styles.linkBtn }}
                    >
                      View Outing
                    </button>
                  )}
                  {request.status === 'declined' && (
                    <button
                      type="button"
                      onClick={() => handleJoinWaitlist(request)}
                      disabled={actionLoading[request.id]}
                      style={{ ...styles.button, ...styles.waitlistBtn, opacity: actionLoading[request.id] ? 0.6 : 1 }}
                    >
                      {actionLoading[request.id] ? 'Adding...' : 'Join Waitlist'}
                    </button>
                  )}
                  {!isArchived && (
                    <button
                      type="button"
                      onClick={() => handleWithdrawRequest(request)}
                      disabled={actionLoading[request.id]}
                      style={{ ...styles.button, ...styles.withdrawBtn, opacity: actionLoading[request.id] ? 0.6 : 1 }}
                    >
                      {actionLoading[request.id] ? 'Removing...' : withdrawLabels[request.status] || 'Remove Request'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
