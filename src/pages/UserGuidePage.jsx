import { useNavigate } from 'react-router-dom';

const styles = {
  container: { maxWidth: '900px', margin: '0 auto', display: 'grid', gap: '12px' },
  backButton: { width: 'fit-content', background: '#e0f2fe', border: '2px solid #0369a1', color: '#0369a1', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', padding: '9px 12px', borderRadius: '8px' },
  header: { borderRadius: '10px', padding: '16px', background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)' },
  title: { color: '#ffffff', fontSize: '1.55rem', fontWeight: 900, margin: '0 0 4px' },
  subtitle: { color: '#e0f2fe', fontSize: '0.98rem', fontWeight: 650, margin: 0, lineHeight: 1.4 },
  card: { background: '#ffffff', border: '1px solid #dbeafe', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 2px rgba(15,23,42,0.06)' },
  sectionTitle: { color: '#0f172a', fontSize: '1.18rem', fontWeight: 900, margin: '0 0 8px' },
  question: { color: '#0f172a', fontSize: '1rem', fontWeight: 900, margin: '12px 0 4px' },
  text: { color: '#475569', fontSize: '0.95rem', lineHeight: 1.48, margin: '0 0 8px' },
  list: { color: '#475569', fontSize: '0.95rem', lineHeight: 1.5, margin: '6px 0 0', paddingLeft: '20px' },
  callout: { background: '#fef3c7', border: '1px solid #f59e0b', color: '#78350f', borderRadius: '8px', padding: '10px 12px', fontSize: '0.95rem', fontWeight: 750, lineHeight: 1.45 },
};

export default function UserGuidePage() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <button type="button" onClick={() => navigate(-1)} style={styles.backButton}>
        ← Back
      </button>

      <div style={styles.header}>
        <h1 style={styles.title}>SailAway User Guide & FAQ</h1>
        <p style={styles.subtitle}>
          SailAway with CGSC helps members post outings, request crew spots, coordinate with approved crew, and keep app feedback inside the app.
        </p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Quick Start</h2>
        <ol style={styles.list}>
          <li>Create your profile with your real name, photo, phone number, sailing experience, and a short bio.</li>
          <li>If you are a boat owner/skipper, add accurate boat information.</li>
          <li>Browse upcoming outings from the home screen.</li>
          <li>Request to join an outing and track the result under My Outing Requests.</li>
          <li>Once approved, use the outing page to see confirmed crew and coordinate in Group Chat.</li>
        </ol>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Requesting to Join</h2>
        <p style={styles.text}>
          Requesting to join does not guarantee a spot. The skipper reviews requests and may mark them Pending, Approved, Declined, or Waitlisted.
        </p>
        <p style={styles.text}>
          Skippers have final judgment. If an outing is full, they may keep members waitlisted, decline a request with a note, update capacity, or intentionally approve beyond the listed capacity when appropriate.
        </p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Outing Group Chat</h2>
        <p style={styles.text}>
          Group Chat is tied to a specific outing. It is available to the skipper and approved crew for that outing.
        </p>
        <p style={styles.text}>
          This app is not intended to replace Facebook, WhatsApp, or general social media. The goal is focused sailing coordination: timing, weather, gear, crew roles, changes of plan, and follow-up with people actually involved in the outing.
        </p>
        <p style={styles.text}>
          Approved crew can see the full chat history for their outing, including messages sent before they were approved. Crew can also continue to see past outing chats so members can follow up and stay connected after sailing together.
        </p>
        <div style={styles.callout}>
          Please monitor the app regularly before upcoming outings. Important outing updates may be posted in Group Chat.
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Privacy & Visibility</h2>
        <p style={styles.text}>
          SailAway is designed for practical club coordination, not open-ended browsing or trolling.
        </p>
        <ul style={styles.list}>
          <li>Skippers can see profiles for members who request to join their outings.</li>
          <li>Approved crew can see the confirmed crew for their shared outing.</li>
          <li>Pending, declined, and waitlisted users do not get access to the outing Group Chat.</li>
          <li>Member visibility is based on real app activity and sailing context.</li>
          <li>Admins can access information needed to support the app and club workflow.</li>
        </ul>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Messaging</h2>
        <p style={styles.text}>
          Direct messaging supports real coordination between visible members. It is not intended as a club-wide broadcast tool for every user.
        </p>
        <p style={styles.text}>
          Admins may send announcements or messages when needed. Members should use Contact Admin, Bug Report, or Feature Request for app-related feedback.
        </p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Notifications</h2>
        <p style={styles.text}>SailAway uses in-app notifications and badges for items such as:</p>
        <ul style={styles.list}>
          <li>Crew request updates</li>
          <li>Outing Group Chat messages</li>
          <li>Direct messages</li>
          <li>Bug report replies</li>
          <li>Feature request replies</li>
          <li>Announcements</li>
        </ul>
        <p style={styles.text}>
          Email alerts may be considered later, but the current workflow keeps communication inside SailAway.
        </p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>FAQ</h2>

        <h3 style={styles.question}>Who can see my profile?</h3>
        <p style={styles.text}>
          Members who have a practical sailing reason to see it, such as skippers reviewing requests and approved crew connected through an outing. Admins can view profiles to support the app.
        </p>

        <h3 style={styles.question}>Why can’t every member message every other member?</h3>
        <p style={styles.text}>
          SailAway is built for sailing coordination, not unsolicited messaging. Visibility and communication are connected to actual club and outing activity.
        </p>

        <h3 style={styles.question}>Can I update test data?</h3>
        <p style={styles.text}>
          Yes. Please keep your profile and boat information accurate before posting real outings.
        </p>

        <h3 style={styles.question}>How do I report a problem?</h3>
        <p style={styles.text}>
          Use Report Bug in the app. Describe what you expected, what actually happened, and include a screenshot if helpful. Screenshots are optional.
        </p>

        <h3 style={styles.question}>How do I suggest an improvement?</h3>
        <p style={styles.text}>
          Use Feature Request in the app. Requests may be marked Pending, In Development, or Implemented.
        </p>

        <h3 style={styles.question}>Is SailAway finished?</h3>
        <p style={styles.text}>
          SailAway is in soft launch. It is ready for broader member use, and feedback will help improve it.
        </p>
      </div>
    </div>
  );
}
