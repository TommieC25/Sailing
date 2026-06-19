const CALENDAR_TIME_ZONE = 'America/New_York';
const DEFAULT_DURATION_MINUTES = 180;

const parseLocalDateTime = (dateString, timeString) => {
  if (!dateString || !timeString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = timeString.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isInteger)) return null;
  return new Date(year, month - 1, day, hour, minute);
};

const calendarTimestamp = (date) => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}T${hour}${minute}00`;
};

const utcTimestamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

const escapeIcsText = (value = '') => String(value)
  .replace(/\\/g, '\\\\')
  .replace(/\n/g, '\\n')
  .replace(/,/g, '\\,')
  .replace(/;/g, '\\;');

const calendarDetails = ({ description, url }) => [
  description?.trim(),
  url ? `View in SailAway: ${url}` : '',
].filter(Boolean).join('\n\n');

const eventTimes = (event) => {
  const start = parseLocalDateTime(event.date, event.time);
  if (!start) return null;
  return {
    start,
    end: new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60_000),
  };
};

export const googleCalendarUrl = (event) => {
  const times = eventTimes(event);
  if (!times) return '';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${calendarTimestamp(times.start)}/${calendarTimestamp(times.end)}`,
    ctz: CALENDAR_TIME_ZONE,
    details: calendarDetails(event),
    location: event.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const appleCalendarContents = (event) => {
  const times = eventTimes(event);
  if (!times) return '';
  const uidTitle = event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SailAway//Calendar Event//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-TIMEZONE:${CALENDAR_TIME_ZONE}`,
    'BEGIN:VEVENT',
    `UID:sailaway-${event.date}-${uidTitle}@tommiec25.github.io`,
    `DTSTAMP:${utcTimestamp(new Date())}`,
    `DTSTART;TZID=${CALENDAR_TIME_ZONE}:${calendarTimestamp(times.start)}`,
    `DTEND;TZID=${CALENDAR_TIME_ZONE}:${calendarTimestamp(times.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(calendarDetails(event))}`,
    `LOCATION:${escapeIcsText(event.location || '')}`,
    event.url ? `URL:${event.url}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
};

export const downloadAppleCalendarEvent = (event) => {
  const ics = appleCalendarContents(event);
  if (!ics) return false;
  const uidTitle = event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event';

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${uidTitle}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  return true;
};
