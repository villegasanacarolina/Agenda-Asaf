import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { getBusy } from '@/lib/google';
import { daySlotStarts, isSlotAvailable, resolveWeek } from '@/lib/slots';
import { addDays, isDateStr, weekday, zonedToUtc } from '@/lib/time';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const cfg = getConfig();
  const now = new Date();
  const requested = request.nextUrl.searchParams.get('week');
  const { week, prevWeek, nextWeek, first, last } = resolveWeek(
    isDateStr(requested) ? requested : null,
    cfg,
    now
  );

  const dates = Array.from({ length: 7 }, (_, i) => addDays(week, i)).filter((d) =>
    cfg.workDays.includes(weekday(d))
  );

  try {
    const rangeStart = zonedToUtc(week, 0, cfg.timezone);
    const rangeEnd = zonedToUtc(addDays(week, 7), 0, cfg.timezone);
    const busy = await getBusy(rangeStart, rangeEnd);

    const days = dates.map((date) => {
      const inWindow = date >= first && date <= last;
      return {
        date,
        slots: daySlotStarts(date, cfg).map((start) => ({
          start: start.toISOString(),
          available: inWindow && isSlotAvailable(start, cfg, busy, now),
        })),
      };
    });

    return NextResponse.json(
      { timezone: cfg.timezone, week, prevWeek, nextWeek, days },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[availability]', err?.response?.data || err);
    return NextResponse.json(
      { error: 'No pudimos consultar la agenda en este momento. Intenta de nuevo en unos minutos.' },
      { status: 500 }
    );
  }
}
