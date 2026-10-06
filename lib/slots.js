import { SLOT_MINUTES } from './config';
import { addDays, mondayOf, todayIn, weekday, zonedToUtc } from './time';

/** Primer y último día que se pueden agendar. */
export function bookingWindow(cfg, now = new Date()) {
  const first = todayIn(cfg.timezone, now);
  const last = addDays(first, cfg.daysAhead - 1);
  return { first, last };
}

/** Inicios (Date) de todos los espacios de 30 min del horario de atención de un día. */
export function daySlotStarts(dateStr, cfg) {
  if (!cfg.workDays.includes(weekday(dateStr))) return [];
  const starts = [];
  for (let m = cfg.workStartMin; m + SLOT_MINUTES <= cfg.workEndMin; m += SLOT_MINUTES) {
    starts.push(zonedToUtc(dateStr, m, cfg.timezone));
  }
  return starts;
}

export function overlapsBusy(startMs, endMs, busy) {
  return busy.some((b) => startMs < b.end && endMs > b.start);
}

/**
 * Indica si un espacio está libre para agendar.
 * busy: [{ start: ms, end: ms }]
 */
export function isSlotAvailable(start, cfg, busy, now = new Date()) {
  const startMs = start.getTime();
  const endMs = startMs + SLOT_MINUTES * 60_000;
  if (startMs < now.getTime() + cfg.minNoticeMinutes * 60_000) return false;
  return !overlapsBusy(startMs, endMs, busy);
}

/** Valida que la fecha enviada por el cliente corresponda exactamente a un espacio real. */
export function isRealSlot(start, cfg, now = new Date()) {
  const { first, last } = bookingWindow(cfg, now);
  const day = todayIn(cfg.timezone, start); // fecha del espacio en la zona del licenciado
  if (day < first || day > last) return false;
  const ms = start.getTime();
  return daySlotStarts(day, cfg).some((s) => s.getTime() === ms);
}

/** Rango semanal visible (lunes a domingo) acotado a la ventana de reserva. */
export function resolveWeek(requested, cfg, now = new Date()) {
  const { first, last } = bookingWindow(cfg, now);
  const minWeek = mondayOf(first);
  const maxWeek = mondayOf(last);
  let week = requested ? mondayOf(requested) : minWeek;
  if (week < minWeek) week = minWeek;
  if (week > maxWeek) week = maxWeek;
  return {
    week,
    prevWeek: week > minWeek ? addDays(week, -7) : null,
    nextWeek: week < maxWeek ? addDays(week, 7) : null,
    first,
    last,
  };
}
