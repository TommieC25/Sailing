import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { announcementAudienceLabel, canViewAnnouncement } from '../utils/announcements';

const styles = {
  container: { maxWidth: '700px', margin: '0 auto' },
  backButton: { background: '#e0f2fe', border: '2px solid #0369a1', color: '#0369a1', fontWeight: 900, fontSize: '1.125rem', marginBottom: '16px', cursor: 'pointer', textDecoration: 'none', padding: '12px 16px', borderRadius: '8px', transition: 'all 0.2s' },
  header: { borderRadius: '12px', padding: '24px', marginBottom: '24px', background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)' },
  headerTitle: { fontSize: '1.875rem', fontWeight: 900, color: '#ffffff', margin: '0 0 8px 0' },
  headerSubtitle: { color: '#e0f2fe', fontSize: '1.125rem', fontWeight: 600, margin: 0 },
  announcements: { display: 'grid', gap: '16px' },
  announcementCard: { background: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '20px' },
  announcementNew: { borderLeft: '4px solid #06b6d4', background: '#f0f9ff' },
  announcementRead: { borderLeft: '4px solid #e5e7eb' },
  announcementTitle: { fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', margin: '0 0 8px 0' },
  announcementMeta: { fontSize: '0.875rem', color: '#64748b', fontWeight: 600, marginBottom: '12px' },
  announcementMessage: { fontSize: '1rem', color: '#475569', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' },
  emptyBox: { background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '32px', textAlign: 'center' },
  emptyIcon: { fontSize: '3rem', marginBottom: '16px' },
  emptyTitle: { fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px', margin: '0 0 8px 0' },
  emptyText: { fontSize: '1.125rem', color: '#64748b', fontWeight: 600, margin: 0 },
  loadingSpinner: { textAlign: 'center', padding: '40px' },
  spinner: { display: 'inline-block', width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#0369a1', animation: 'spin 0.8s linear infinite' },
};

export default function AnnouncementsFeed() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [viewedAnnouncements, setViewedAnnouncements] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAnnouncements = async () => {
      try {
        const { data: allAnnouncements, error: announcementsError } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });

        if (announcementsError) throw announcementsError;
        const visibleAnnouncements = (allAnnouncements || []).filter((announcement) => canViewAnnouncement(announcement, profile));
        setAnnouncements(visibleAnnouncements);

        const { data: views, error: viewsError } = await supabase
          .from('announcement_views')
          .select('announcement_id')
          .eq('user_id', user.id);

        if (viewsError) throw viewsError;
        const viewedIds = views?.map((v) => v.announcement_id) || [];
        setViewedAnnouncements(new Set(viewedIds));

        // Mark all as viewed for this user
        if (visibleAnnouncements.length > 0) {
          const unviewedIds = visibleAnnouncements
            .filter((a) => !views?.some((v) => v.announcement_id === a.id))
            .map((a) => a.id);

          if (unviewedIds.length > 0) {
            await supabase.from('announcement_views').insert(
              unviewedIds.map((id) => ({
                announcement_id: id,
                user_id: user.id,
              }))
            );
            setViewedAnnouncements(new Set([...viewedIds, ...unviewedIds]));
          }
        }
      } catch (err) {
        console.error('Error fetching announcements:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [user, profile]);

  if (loading) {
    return (
      <div style={styles.loadingSpinner}>
        <div style={styles.spinner} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button
        onClick={() => navigate('/')}
        style={styles.backButton}
        onMouseEnter={(e) => e.target.style.background = '#bfdbfe'}
        onMouseLeave={(e) => e.target.style.background = '#e0f2fe'}
      >
        ← Back
      </button>

      <div style={styles.header}>
        <h1 style={styles.headerTitle}>🔔 Announcements</h1>
        <p style={styles.headerSubtitle}>Important updates from CGSC</p>
      </div>

      {announcements.length === 0 ? (
        <div style={styles.emptyBox}>
          <div style={styles.emptyIcon}>📢</div>
          <p style={styles.emptyTitle}>No announcements yet</p>
          <p style={styles.emptyText}>Check back soon for updates from the club</p>
        </div>
      ) : (
        <div style={styles.announcements}>
          {announcements.map((announcement) => {
            const isNew = !viewedAnnouncements.has(announcement.id);
            const date = new Date(announcement.created_at);
            const dateStr = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
            });
            const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

            return (
              <div
                key={announcement.id}
                style={{
                  ...styles.announcementCard,
                  ...(isNew ? styles.announcementNew : styles.announcementRead),
                }}
              >
                <h3 style={styles.announcementTitle}>
                  {isNew && <span style={{ color: '#06b6d4', marginRight: '8px' }}>●</span>}
                  {announcement.title}
                </h3>
                <p style={styles.announcementMeta}>
                  📍 CGSC Admin • {announcementAudienceLabel(announcement.audience)} • {dateStr} at {timeStr}
                </p>
                <p style={styles.announcementMessage}>{announcement.message}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
