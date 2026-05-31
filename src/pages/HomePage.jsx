import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { formatLocalDate, todayLocalDateString } from '../utils/dateUtils';

const HEADER_BG = 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)';

export default function HomePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [outings, setOutings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchOutings = async () => {
      try {
        const { data, error: err } = await supabase
          .from('outings')
          .select(`
            *,
            boats (name, size_ft, capacity, owner_id)
          `)
          .gte('outing_date', todayLocalDateString())
          .order('outing_date', { ascending: true })
          .order('outing_time', { ascending: true });

        if (err) throw err;

        const skipperIds = [...new Set((data || []).map((outing) => outing.skipper_id).filter(Boolean))];
        const { data: skippers, error: skipperError } = skipperIds.length
          ? await supabase
              .from('public_profiles')
              .select('id, full_name')
              .in('id', skipperIds)
          : { data: [], error: null };

        if (skipperError) throw skipperError;

        const skipperById = Object.fromEntries((skippers || []).map((skipper) => [skipper.id, skipper]));
        let pendingByOutingId = {};
        if (profile?.user_type === 'owner') {
          const yourOutingIds = (data || [])
            .filter((outing) => outing.skipper_id === user.id)
            .map((outing) => outing.id);

          if (yourOutingIds.length > 0) {
            const { data: pendingRequests, error: pendingError } = await supabase
              .from('crew_requests')
              .select('outing_id')
              .in('outing_id', yourOutingIds)
              .eq('status', 'pending');

            if (pendingError) throw pendingError;

            pendingByOutingId = (pendingRequests || []).reduce((counts, request) => {
              counts[request.outing_id] = (counts[request.outing_id] || 0) + 1;
              return counts;
            }, {});
          }
        }

        setOutings((data || []).map((outing) => ({
          ...outing,
          skipper: skipperById[outing.skipper_id] || null,
          pendingCrewRequestCount: pendingByOutingId[outing.id] || 0,
        })));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOutings();
  }, [user, profile]);

  if (authLoading) {
    return (
      <div style={{textAlign: 'center', padding: '40px'}}>
        <div style={{display: 'inline-block', width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#0369a1', animation: 'spin 0.8s linear infinite'}} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;

  const yourOutings = outings.filter((o) => o.skipper_id === user?.id);
  const otherOutings = outings.filter((o) => o.skipper_id !== user?.id);
  const isSkipper = profile?.user_type === 'owner';

  return (
    <div style={{marginLeft: '-10px', marginRight: '-10px', marginTop: '-16px'}}>
      {/* Header with greeting */}
      <div style={{background: HEADER_BG, padding: '20px 14px', color: '#ffffff', marginBottom: '16px'}}>
        <h1 style={{fontSize: '1.55rem', fontWeight: 900, margin: '0 0 2px 0'}}>Hello, {profile?.full_name || 'Sailor'}! 👋</h1>
        <p style={{fontSize: '1rem', margin: 0, opacity: 0.95}}>
          {isSkipper ? "Your outings are waiting for crew." : "Find your next adventure on the water."}
        </p>
      </div>

      {/* Main content with padding */}
      <div style={{padding: '0 12px 24px 12px'}}>

        {/* Bio prompt - shown to users who haven't filled in their bio yet */}
        {profile && !profile.bio?.trim() && (
          <div style={{background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '10px', padding: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'}}>
            <div style={{flex: 1, minWidth: '200px'}}>
              <p style={{fontSize: '1rem', fontWeight: 900, color: '#78350f', margin: '0 0 4px 0'}}>👋 Welcome aboard, {profile.full_name?.split(' ')[0] || 'sailor'}!</p>
              <p style={{fontSize: '0.92rem', color: '#92400e', margin: 0, fontWeight: 600, lineHeight: 1.35}}>
                Tell other sailors a bit about yourself — your experience, what you love about sailing, anything you'd want a skipper or crewmate to know.
              </p>
            </div>
            <Link
              to="/profile"
              style={{background: '#0c2340', color: '#ffffff', padding: '9px 14px', borderRadius: '8px', fontWeight: 900, fontSize: '0.95rem', textDecoration: 'none', whiteSpace: 'nowrap'}}
            >
              Add bio →
            </Link>
          </div>
        )}

        {error && (
          <div style={{background: '#fee2e2', border: '2px solid #dc2626', color: '#7f1d1d', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.95rem', fontWeight: 600}}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{textAlign: 'center', padding: '40px'}}>
            <div style={{display: 'inline-block', width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#0369a1', animation: 'spin 0.8s linear infinite'}} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!loading && isSkipper && yourOutings.length === 0 && (
          <div style={{background: '#ffffff', border: '2px solid #dbeafe', borderRadius: '10px', padding: '20px', textAlign: 'center', marginBottom: '20px'}}>
            <p style={{fontSize: '2rem', margin: '0 0 10px 0'}}>🚢</p>
            <p style={{fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', margin: '0 0 6px 0'}}>No outings posted yet</p>
            <p style={{fontSize: '1rem', color: '#64748b', margin: '0 0 16px 0'}}>Post your first outing to find crew and get sailing!</p>
            <Link
              to="/create-outing"
              style={{display: 'inline-block', background: '#06b6d4', color: '#ffffff', padding: '11px 18px', borderRadius: '8px', fontWeight: 900, fontSize: '1rem', textDecoration: 'none'}}
            >
              + Post Outing
            </Link>
          </div>
        )}

        {/* Your Outings (for skipper) */}
        {!loading && isSkipper && yourOutings.length > 0 && (
          <div style={{marginBottom: '20px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px', gap: '10px'}}>
              <h2 style={{fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', margin: 0}}>
                📋 Your Upcoming Outings ({yourOutings.length})
              </h2>
              <Link to="/create-outing" style={{fontSize: '1rem', fontWeight: 900, color: '#0369a1', textDecoration: 'none'}}>+ New</Link>
            </div>
            {yourOutings.some((outing) => outing.pendingCrewRequestCount > 0) && (
              <Link
                to="/skipper-dashboard?show=pending"
                style={{display: 'block', background: '#fef3c7', border: '2px solid #f59e0b', color: '#78350f', borderRadius: '10px', padding: '10px 12px', marginBottom: '10px', fontWeight: 900, textDecoration: 'none'}}
              >
                {yourOutings.reduce((total, outing) => total + outing.pendingCrewRequestCount, 0)} crew request pending
              </Link>
            )}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '10px'}}>
              {yourOutings.map((outing) => (
                <OutingCard key={outing.id} outing={outing} isYours={true} />
              ))}
            </div>
          </div>
        )}

        {/* Other Outings */}
        {!loading && otherOutings.length > 0 && (
          <div>
            <h2 style={{fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '10px', margin: '0 0 10px 0'}}>
              {isSkipper ? '⛵ Other Upcoming Outings' : '⛵ Upcoming Outings'}
            </h2>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '10px'}}>
              {otherOutings.map((outing) => (
                <OutingCard key={outing.id} outing={outing} isYours={false} />
              ))}
            </div>
          </div>
        )}

        {!loading && outings.length === 0 && (
          <div style={{background: '#ffffff', border: '2px solid #dbeafe', borderRadius: '10px', padding: '20px', textAlign: 'center'}}>
            <p style={{fontSize: '2rem', margin: '0 0 10px 0'}}>⛵</p>
            <p style={{fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', margin: '0 0 6px 0'}}>No upcoming outings yet</p>
            <p style={{fontSize: '1rem', color: '#64748b', margin: 0}}>Check back soon as skippers post their upcoming sails!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function OutingCard({ outing, isYours }) {
  const totalSpots = outing.boats?.capacity || 0;
  const availableSpots = outing.capacity_available || 0;
  const filledSpots = totalSpots - availableSpots;

  return (
    <Link
      to={`/outing/${outing.id}`}
      style={{display: 'block', textDecoration: 'none', color: 'inherit'}}
    >
      <div style={{background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'}}>
        {/* Title and availability badge */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px'}}>
          <h3 style={{fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', margin: 0}}>{outing.title}</h3>
          {availableSpots > 0 && !isYours && (
            <span style={{background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap'}}>
              {availableSpots} spot{availableSpots !== 1 ? 's' : ''}
            </span>
          )}
          {availableSpots === 0 && !isYours && (
            <span style={{background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0}}>
              Full
            </span>
          )}
          {isYours && (
            <span style={{background: outing.pendingCrewRequestCount > 0 ? '#fee2e2' : '#fef3c7', color: outing.pendingCrewRequestCount > 0 ? '#991b1b' : '#92400e', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0}}>
              {outing.pendingCrewRequestCount > 0 ? `${outing.pendingCrewRequestCount} request${outing.pendingCrewRequestCount !== 1 ? 's' : ''}` : 'Your outing'}
            </span>
          )}
        </div>

        {/* Condensed info line */}
        <div style={{fontSize: '0.9rem', color: '#64748b', marginBottom: '8px', fontWeight: 600, lineHeight: '1.35'}}>
          <div>📅 {formatLocalDate(outing.outing_date, { weekday: 'short', month: 'short', day: 'numeric' })} at {outing.outing_time}</div>
          <div>🚢 {outing.boats?.name} ({outing.boats?.size_ft}ft) • 👤 {outing.skipper?.full_name || 'TBD'} • {filledSpots}/{totalSpots} crew</div>
        </div>

        {/* Description - condensed */}
        {outing.description && (
          <p style={{color: '#64748b', margin: '0 0 8px 0', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
            {outing.description}
          </p>
        )}

        {/* Button - touch-friendly (44px minimum height) */}
        <div style={{background: outing.pendingCrewRequestCount > 0 ? '#f59e0b' : '#06b6d4', color: outing.pendingCrewRequestCount > 0 ? '#111827' : '#ffffff', padding: '8px 12px', borderRadius: '8px', textAlign: 'center', fontWeight: 900, fontSize: '0.95rem', minHeight: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          {outing.pendingCrewRequestCount > 0 ? 'Review Requests →' : 'View Details →'}
        </div>
      </div>
    </Link>
  );
}
