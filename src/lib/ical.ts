import { Reminder } from '../types';

/**
 * Formats a Date object to UTC iCal date-time string: YYYYMMDDTHHmmssZ
 */
function toIcsDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Generates an RFC 5545 iCalendar (.ics) string.
 */
export function generateIcsContent(reminder: Reminder): string {
  const startDate = new Date(reminder.targetTimestamp * 1000);
  const endDate = new Date((reminder.targetTimestamp + 30 * 60) * 1000); // 30 mins duration

  const dtStamp = toIcsDateString(new Date());
  const dtStart = toIcsDateString(startDate);
  const dtEnd = toIcsDateString(endDate);
  const uid = `void_rem_${reminder.id}_${reminder.targetTimestamp}@tgcloud.ai`;

  const cleanTitle = (reminder.title || 'یادآور').replace(/[\r\n]+/g, ' ');
  const cleanDesc = (reminder.description || '').replace(/\r?\n/g, '\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Void Markt//Telegram Serverless Reminder//FA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${cleanTitle}`,
    cleanDesc ? `DESCRIPTION:${cleanDesc}` : '',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${cleanTitle}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/**
 * Downloads the .ics file to client device (native iPhone / Android Calendar import).
 */
export function downloadIcsFile(reminder: Reminder): void {
  const content = generateIcsContent(reminder);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reminder_${reminder.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Returns a direct Google Calendar event creation URL.
 */
export function getGoogleCalendarUrl(reminder: Reminder): string {
  const startDate = new Date(reminder.targetTimestamp * 1000);
  const endDate = new Date((reminder.targetTimestamp + 30 * 60) * 1000);

  const startIso = toIcsDateString(startDate);
  const endIso = toIcsDateString(endDate);

  const title = encodeURIComponent(reminder.title);
  const details = encodeURIComponent(
    (reminder.description ? `${reminder.description}\n\n` : '') +
      `تنظیم‌شده توسط ربات یادآور The Void (سرورلس تلگرام)`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}`;
}
