import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

const styles = {
  container: { maxWidth: '800px', margin: '0 auto' },
  header: { marginBottom: '2rem', padding: '20px', background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)', borderRadius: '12px', color: '#ffffff' },
  title: { fontSize: '2rem', fontWeight: 900, margin: '0 0 8px 0' },
  subtitle: { fontSize: '1.125rem', margin: 0, opacity: 0.9 },
  controls: { display: 'flex', gap: '12px', marginBottom: '2rem', flexWrap: 'wrap' },
  searchInput: { flex: 1, minWidth: '200px', padding: '12px', fontSize: '1rem', border: '2px solid #dbeafe', borderRadius: '8px', fontFamily: 'inherit', color: '#1e293b', background: '#ffffff' },
  selectInput: { padding: '12px', fontSize: '1rem', border: '2px solid #dbeafe', borderRadius: '8px', fontFamily: 'inherit', minWidth: '150px', color: '#1e293b', background: '#ffffff' },
  grid: { display: 'grid', gap: '16px', marginBottom: '2rem' },
  card: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', gap: '16px', cursor: 'pointer', transition: 'all 0.2s', textDecoration: 'none', color: 'inherit' },
  cardHover: { boxShadow: '0 8px 16px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' },
  photo: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #bfdbfe' },
  photoPlaceholder: { width: '80px', height: '80px', borderRadius: '50%', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0, border: '2px solid #bfdbfe' },
  cardContent: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  cardName: { fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', margin: 0 },
  cardSkill: { fontSize: '1rem', color: '#64748b', marginTop: '4px' },
  loading: { textAlign: 'center', padding: '40px', fontSize: '1.1rem', color: '#666' },
  empty: { textAlign: 'center', padding: '40px', background: '#f0f4f8', borderRadius: '12px', color: '#666' },
  emptyIcon: { fontSize: '3rem', marginBottom: '12px' },
};

export default function CommunityPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, photo_url, sailing_experience');

        if (error) throw error;
        setProfiles(data || []);
      } catch (err) {
        console.error('Error fetching profiles:', err);
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchProfiles();
  }, [user]);

  useEffect(() => {
    let result = [...profiles];

    if (searchTerm) {
      result = result.filter(p =>
        p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'name-asc') {
        const lastNameA = a.full_name.split(' ').pop().toLowerCase();
        const lastNameB = b.full_name.split(' ').pop().toLowerCase();
        return lastNameA.localeCompare(lastNameB);
      } else if (sortBy === 'name-desc') {
        const lastNameA = a.full_name.split(' ').pop().toLowerCase();
        const lastNameB = b.full_name.split(' ').pop().toLowerCase();
        return lastNameB.localeCompare(lastNameA);
      } else if (sortBy === 'skill-asc') {
        const skillOrder = { beginner: 0, intermediate: 1, advanced: 2 };
        return (skillOrder[a.sailing_experience] || -1) - (skillOrder[b.sailing_experience] || -1);
      } else if (sortBy === 'skill-desc') {
        const skillOrder = { beginner: 0, intermediate: 1, advanced: 2 };
        return (skillOrder[b.sailing_experience] || -1) - (skillOrder[a.sailing_experience] || -1);
      }
      return 0;
    });

    setFilteredProfiles(result);
  }, [profiles, searchTerm, sortBy]);

  if (!user) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Community</h1>
        <p style={styles.subtitle}>Browse all sailors and connect with the community</p>
      </div>

      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.selectInput}>
          <option value="name-asc">Last Name A-Z</option>
          <option value="name-desc">Last Name Z-A</option>
          <option value="skill-asc">Skill: Beginner First</option>
          <option value="skill-desc">Skill: Advanced First</option>
        </select>
      </div>

      {loading && <div style={styles.loading}>Loading community...</div>}

      {!loading && filteredProfiles.length === 0 && (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>👥</div>
          <p>{searchTerm ? 'No sailors found matching your search' : 'No community members yet'}</p>
        </div>
      )}

      {!loading && filteredProfiles.length > 0 && (
        <div style={styles.grid}>
          {filteredProfiles.map((profile) => (
            <Link
              key={profile.id}
              to={`/profile/${profile.id}`}
              style={{
                ...styles.card,
                ...(hoveredId === profile.id ? styles.cardHover : {})
              }}
              onMouseEnter={() => setHoveredId(profile.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {profile.photo_url ? (
                <img src={profile.photo_url} alt={profile.full_name} style={styles.photo} />
              ) : (
                <div style={styles.photoPlaceholder}>📷</div>
              )}
              <div style={styles.cardContent}>
                <p style={styles.cardName}>{profile.full_name}</p>
                <p style={styles.cardSkill}>
                  {profile.sailing_experience
                    ? profile.sailing_experience.charAt(0).toUpperCase() + profile.sailing_experience.slice(1)
                    : 'Not specified'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
