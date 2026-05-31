import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

const styles = {
  container: { maxWidth: '820px', margin: '0 auto' },
  backButton: { background: '#e0f2fe', border: '2px solid #0369a1', color: '#0369a1', fontWeight: 900, fontSize: '1rem', marginBottom: '16px', cursor: 'pointer', padding: '12px 16px', borderRadius: '8px' },
  header: { background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)', borderRadius: '10px', padding: '22px', color: '#ffffff', marginBottom: '18px' },
  title: { fontSize: '1.75rem', fontWeight: 900, margin: '0 0 6px' },
  subtitle: { color: '#e0f2fe', fontWeight: 700, margin: 0 },
  sectionTitle: { color: '#0f172a', fontSize: '1.15rem', fontWeight: 900, margin: '22px 0 10px' },
  list: { display: 'grid', gap: '10px' },
  cardButton: { width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', textAlign: 'left', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  row: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', background: '#e0f2fe', flexShrink: 0 },
  avatarPlaceholder: { width: '42px', height: '42px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 },
  name: { color: '#0369a1', fontWeight: 900, fontSize: '1.05rem', margin: 0 },
  preview: { color: '#64748b', fontWeight: 650, fontSize: '0.92rem', margin: '3px 0 0', lineHeight: 1.35 },
  badge: { marginLeft: 'auto', background: '#ef4444', color: '#ffffff', borderRadius: '999px', padding: '3px 8px', fontSize: '0.8rem', fontWeight: 900 },
  empty: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', color: '#64748b', fontWeight: 700 },
  error: { background: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b', padding: '14px', borderRadius: '8px', fontWeight: 800, marginBottom: '16px' },
};

export default function MessagesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        setError('');

        const { data: profileData, error: profilesError } = await supabase
          .from('public_profiles')
          .select('id, full_name, photo_url, user_type, sailing_experience')
          .neq('id', user.id)
          .order('full_name', { ascending: true });

        if (profilesError) throw profilesError;

        const profiles = profileData || [];
        const profileById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
        setMembers(profiles);

        const { data: messageData, error: messagesError } = await supabase
          .from('direct_messages')
          .select('*')
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(500);

        if (messagesError) throw messagesError;

        const byMember = {};
        for (const message of messageData || []) {
          const otherId = message.sender_id === user.id ? message.recipient_id : message.sender_id;
          if (!byMember[otherId]) {
            byMember[otherId] = {
              member: profileById[otherId] || { id: otherId, full_name: 'Member' },
              latest: message,
              unread: 0,
            };
          }
          if (message.recipient_id === user.id && !message.read_at) {
            byMember[otherId].unread += 1;
          }
        }

        setConversations(Object.values(byMember).sort((a, b) => new Date(b.latest.created_at) - new Date(a.latest.created_at)));
      } catch (err) {
        setError(err.message || 'Could not load messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [user]);

  const openThread = (memberId) => {
    navigate(`/messages/${memberId}`);
  };

  return (
    <div style={styles.container}>
      <button type="button" onClick={() => navigate('/')} style={styles.backButton}>
        Back
      </button>

      <div style={styles.header}>
        <h1 style={styles.title}>Messages</h1>
        <p style={styles.subtitle}>Private one-on-one conversations with members</p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.empty}>Loading messages...</div>
      ) : (
        <>
          <h2 style={styles.sectionTitle}>Recent Conversations</h2>
          {conversations.length === 0 ? (
            <div style={styles.empty}>No conversations yet.</div>
          ) : (
            <div style={styles.list}>
              {conversations.map((conversation) => (
                <button key={conversation.member.id} type="button" onClick={() => openThread(conversation.member.id)} style={styles.cardButton}>
                  <div style={styles.row}>
                    {conversation.member.photo_url ? (
                      <img src={conversation.member.photo_url} alt={conversation.member.full_name} style={styles.avatar} />
                    ) : (
                      <div style={styles.avatarPlaceholder}>👤</div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={styles.name}>{conversation.member.full_name || 'Member'}</p>
                      <p style={styles.preview}>
                        {conversation.latest.sender_id === user.id ? 'You: ' : ''}{conversation.latest.body}
                      </p>
                    </div>
                    {conversation.unread > 0 && <span style={styles.badge}>{conversation.unread}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}

          <h2 style={styles.sectionTitle}>Start a Message</h2>
          {members.length === 0 ? (
            <div style={styles.empty}>No visible members yet.</div>
          ) : (
            <div style={styles.list}>
              {members.map((member) => (
                <button key={member.id} type="button" onClick={() => openThread(member.id)} style={styles.cardButton}>
                  <div style={styles.row}>
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.full_name} style={styles.avatar} />
                    ) : (
                      <div style={styles.avatarPlaceholder}>👤</div>
                    )}
                    <div>
                      <p style={styles.name}>{member.full_name || 'Member'}</p>
                      <p style={styles.preview}>{[member.user_type, member.sailing_experience].filter(Boolean).join(' · ') || 'Member profile'}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
