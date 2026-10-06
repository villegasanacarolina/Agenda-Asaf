import { JWT } from 'google-auth-library';
import { getConfig } from './config';
import { demoCreateEvent, demoGetBusy } from './demo';

const API = 'https://www.googleapis.com/calendar/v3';
let client = null;

function normalizeKey(raw) {
  let key = (raw || '').trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

function getClient() {
  if (client) return client;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = normalizeKey(process.env.GOOGLE_PRIVATE_KEY);
  if (!email || !key || !getConfig().calendarId) {
    throw new Error(
      'Faltan variables de entorno: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY y GOOGLE_CALENDAR_ID.'
    );
  }
  client = new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return client;
}

/**
 * Devuelve los bloques ocupados del calendario (cualquier evento, de cualquier duración)
 * entre timeMin y timeMax, como [{ start: ms, end: ms }].
 */
export async function getBusy(timeMin, timeMax) {
  const cfg = getConfig();
  if (cfg.demoMode) return demoGetBusy(timeMin, timeMax);

  const ids = [cfg.calendarId, ...cfg.busyCalendarIds];
  const res = await getClient().request({
    url: `${API}/freeBusy`,
    method: 'POST',
    data: {
      timeMin: new Date(timeMin).toISOString(),
      timeMax: new Date(timeMax).toISOString(),
      timeZone: cfg.timezone,
      items: ids.map((id) => ({ id })),
    },
  });

  const busy = [];
  for (const id of ids) {
    const cal = res.data.calendars?.[id];
    // Si Google no puede leer el calendario NO asumimos que está libre.
    if (!cal || (cal.errors && cal.errors.length)) {
      const reason = cal?.errors?.map((e) => e.reason).join(', ') || 'sin respuesta';
      throw new Error(`No se pudo leer el calendario "${id}" (${reason}). ¿Está compartido con la cuenta de servicio?`);
    }
    for (const b of cal.busy || []) {
      busy.push({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() });
    }
  }
  return busy;
}

/** Crea el evento de la cita en el calendario del licenciado. */
export async function createEvent({ summary, description, start, end }) {
  const cfg = getConfig();
  if (cfg.demoMode) return demoCreateEvent({ start, end });

  const res = await getClient().request({
    url: `${API}/calendars/${encodeURIComponent(cfg.calendarId)}/events`,
    method: 'POST',
    data: {
      summary,
      description,
      start: { dateTime: start.toISOString(), timeZone: cfg.timezone },
      end: { dateTime: end.toISOString(), timeZone: cfg.timezone },
      transparency: 'opaque',
      reminders: { useDefault: true },
    },
  });
  return res.data;
}
