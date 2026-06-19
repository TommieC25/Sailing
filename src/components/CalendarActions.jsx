import { useMemo, useState } from 'react';
import { downloadAppleCalendarEvent, googleCalendarUrl } from '../utils/calendarUtils';

const styles = {
  container: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' },
  button: { borderRadius: '7px', padding: '8px 11px', font: 'inherit', fontSize: '0.9rem', fontWeight: 900, cursor: 'pointer', textDecoration: 'none' },
  trigger: { background: '#e0f2fe', border: '2px solid #0284c7', color: '#075985' },
  apple: { background: '#ffffff', border: '2px solid #475569', color: '#1e293b' },
  google: { background: '#ffffff', border: '2px solid #16a34a', color: '#166534' },
};

export default function CalendarActions({ event }) {
  const [open, setOpen] = useState(false);
  const googleUrl = useMemo(() => googleCalendarUrl(event), [event]);
  const disabled = !event.date || !event.time;

  return (
    <div style={styles.container}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        aria-expanded={open}
        style={{ ...styles.button, ...styles.trigger, opacity: disabled ? 0.55 : 1 }}
      >
        📅 {disabled ? 'Time required for calendar' : 'Add to Calendar'}
      </button>
      {open && !disabled && (
        <>
          <button type="button" onClick={() => downloadAppleCalendarEvent(event)} style={{ ...styles.button, ...styles.apple }}>
            Apple / iOS
          </button>
          <a href={googleUrl} target="_blank" rel="noopener noreferrer" style={{ ...styles.button, ...styles.google }}>
            Android / Google
          </a>
        </>
      )}
    </div>
  );
}
