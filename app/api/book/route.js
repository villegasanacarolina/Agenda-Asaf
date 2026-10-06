import { NextResponse } from 'next/server';
import { getConfig, SLOT_MINUTES } from '@/lib/config';
import { createEvent, getBusy } from '@/lib/google';
import { isRealSlot, overlapsBusy } from '@/lib/slots';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clean(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Solicitud inválida.');
  }

  // Campo trampa contra bots: las personas nunca lo ven ni lo llenan.
  if (body.website) return NextResponse.json({ ok: true });

  const name = clean(body.name, 120).replace(/\s+/g, ' ');
  const reason = clean(body.reason, 2000);
  const contact = clean(body.contact, 150);

  if (name.length < 3) return fail('Escribe tu nombre completo.');
  if (reason.length < 5) return fail('Cuéntanos brevemente el motivo de tu consulta.');

  const start = new Date(body.start);
  if (Number.isNaN(start.getTime())) return fail('Horario inválido.');

  const cfg = getConfig();
  const now = new Date();
  const end = new Date(start.getTime() + SLOT_MINUTES * 60_000);

  if (!isRealSlot(start, cfg, now) || start.getTime() < now.getTime() + cfg.minNoticeMinutes * 60_000) {
    return fail('Ese horario ya no está disponible. Elige otro, por favor.', 409);
  }

  try {
    // Volvemos a consultar el calendario justo antes de guardar para evitar empalmes.
    const busy = await getBusy(start, end);
    if (overlapsBusy(start.getTime(), end.getTime(), busy)) {
      return fail('Alguien acaba de ocupar ese horario. Elige otro, por favor.', 409);
    }

    const description = contact ? `${reason}\n\nContacto: ${contact}` : reason;
    await createEvent({ summary: name, description, start, end });

    return NextResponse.json({ ok: true, start: start.toISOString(), end: end.toISOString() });
  } catch (err) {
    console.error('[book]', err?.response?.data || err);
    return fail('No pudimos registrar tu cita. Intenta de nuevo en unos minutos.', 500);
  }
}
