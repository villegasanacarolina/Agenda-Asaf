function parseList(value) {
  return (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseHHMM(value, fallback) {
  const m = /^(\d{1,2}):(\d{2})$/.exec((value || '').trim());
  if (!m) return fallback;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59) return fallback;
  return h * 60 + min;
}

export const SLOT_MINUTES = 30;

export function getConfig() {
  const workDays = parseList(process.env.WORK_DAYS || '1,2,3,4,5')
    .map((n) => parseInt(n, 10))
    .filter((n) => n >= 0 && n <= 6);

  return {
    timezone: process.env.TIMEZONE || 'America/Mexico_City',
    workStartMin: parseHHMM(process.env.WORK_START, 9 * 60),
    workEndMin: parseHHMM(process.env.WORK_END, 18 * 60),
    workDays: workDays.length ? workDays : [1, 2, 3, 4, 5],
    daysAhead: Math.max(1, parseInt(process.env.DAYS_AHEAD || '30', 10) || 30),
    minNoticeMinutes: Math.max(0, parseInt(process.env.MIN_NOTICE_MINUTES || '120', 10) || 0),
    calendarId: process.env.GOOGLE_CALENDAR_ID || '',
    busyCalendarIds: parseList(process.env.BUSY_CALENDAR_IDS),
    demoMode: process.env.DEMO_MODE === 'true',
  };
}
