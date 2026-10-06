// Utilidades de fecha/hora con zona horaria, sin dependencias externas.
// Las fechas "de calendario" se manejan como texto 'YYYY-MM-DD'.

const formatters = new Map();

function getFormatter(timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(
      timeZone,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );
  }
  return formatters.get(timeZone);
}

/** Partes de una fecha tal como se ven en la zona horaria indicada. */
export function zonedParts(date, timeZone) {
  const parts = {};
  for (const p of getFormatter(timeZone).formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function offsetMs(date, timeZone) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convierte una hora "de reloj" en la zona indicada a un instante UTC. */
export function zonedToUtc(dateStr, minutesOfDay, timeZone) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutesOfDay / 60), minutesOfDay % 60);
  const off1 = offsetMs(new Date(guess), timeZone);
  let result = guess - off1;
  const off2 = offsetMs(new Date(result), timeZone);
  if (off2 !== off1) result = guess - off2;
  return new Date(result);
}

export function toDateStr(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function isDateStr(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return toDateStr(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** 0 = domingo ... 6 = sábado */
export function weekday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function todayIn(timeZone, now = new Date()) {
  const p = zonedParts(now, timeZone);
  return toDateStr(p.year, p.month, p.day);
}

/** Lunes de la semana a la que pertenece la fecha. */
export function mondayOf(dateStr) {
  return addDays(dateStr, -((weekday(dateStr) + 6) % 7));
}
