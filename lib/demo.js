// Modo demo: permite ver y probar la página sin conectar Google Calendar.
// Se activa con DEMO_MODE=true. Las citas se guardan solo en memoria.
import { getConfig } from './config';
import { addDays, todayIn, zonedToUtc } from './time';

const booked = [];

export function demoGetBusy() {
  const { timezone } = getConfig();
  const today = todayIn(timezone);
  const fake = [];
  // Algunos bloques de ejemplo: una junta de 3 horas, comidas y una audiencia.
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, i);
    if (i % 3 === 1) fake.push([d, 10 * 60, 13 * 60]);
    if (i % 2 === 0) fake.push([d, 14 * 60, 15 * 60]);
    if (i % 4 === 2) fake.push([d, 16 * 60 + 30, 17 * 60 + 15]);
  }
  return [
    ...fake.map(([d, s, e]) => ({
      start: zonedToUtc(d, s, timezone).getTime(),
      end: zonedToUtc(d, e, timezone).getTime(),
    })),
    ...booked,
  ];
}

export function demoCreateEvent({ start, end }) {
  booked.push({ start: start.getTime(), end: end.getTime() });
  return { id: `demo-${Date.now()}` };
}
