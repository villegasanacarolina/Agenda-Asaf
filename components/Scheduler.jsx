'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const LOCALE = 'es-MX';

function dateFromStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function fmtDay(dateStr, opts) {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', ...opts }).format(dateFromStr(dateStr));
}

function fmtTime(iso, timeZone) {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, hour: 'numeric', minute: '2-digit' }).format(
    new Date(iso)
  );
}

function fmtLong(iso, timeZone) {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}, ${fmtTime(iso, timeZone)}`;
}

function weekLabel(days) {
  if (!days.length) return '';
  const a = days[0].date;
  const b = days[days.length - 1].date;
  const sameMonth = a.slice(0, 7) === b.slice(0, 7);
  const start = fmtDay(a, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' });
  const end = fmtDay(b, { day: 'numeric', month: 'long', year: 'numeric' });
  return `${start} – ${end}`;
}

export default function Scheduler() {
  const [week, setWeek] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDay, setActiveDay] = useState(0);
  const [slot, setSlot] = useState(null);

  const load = useCallback(async (w) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/availability${w ? `?week=${w}` : ''}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setData(json);
      const firstOpen = json.days.findIndex((d) => d.slots.some((s) => s.available));
      setActiveDay(firstOpen >= 0 ? firstOpen : 0);
    } catch (e) {
      setError(e.message || 'No pudimos cargar la agenda.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(week);
  }, [week, load]);

  const totalOpen = useMemo(
    () => (data ? data.days.reduce((n, d) => n + d.slots.filter((s) => s.available).length, 0) : 0),
    [data]
  );

  return (
    <section className="card" aria-labelledby="agenda-title">
      <div className="card-head">
        <div>
          <h2 id="agenda-title">Selecciona un horario</h2>
          <p className="muted">Los espacios en azul están disponibles.</p>
        </div>
        <div className="legend" aria-hidden="true">
          <span>
            <i className="dot dot-free" /> Disponible
          </span>
          <span>
            <i className="dot dot-busy" /> No disponible
          </span>
        </div>
      </div>

      <div className="week-nav">
        <button
          type="button"
          className="nav-btn"
          onClick={() => setWeek(data?.prevWeek)}
          disabled={!data?.prevWeek || loading}
          aria-label="Semana anterior"
        >
          ‹
        </button>
        <p className="week-label">{data ? weekLabel(data.days) : ' '}</p>
        <button
          type="button"
          className="nav-btn"
          onClick={() => setWeek(data?.nextWeek)}
          disabled={!data?.nextWeek || loading}
          aria-label="Semana siguiente"
        >
          ›
        </button>
      </div>

      {error && (
        <div className="notice notice-error">
          <p>{error}</p>
          <button type="button" className="link-btn" onClick={() => load(week)}>
            Reintentar
          </button>
        </div>
      )}

      {!error && data && (
        <>
          <div className="day-tabs" role="tablist" aria-label="Días de la semana">
            {data.days.map((d, i) => {
              const open = d.slots.some((s) => s.available);
              return (
                <button
                  key={d.date}
                  type="button"
                  role="tab"
                  aria-selected={i === activeDay}
                  className={`day-tab${i === activeDay ? ' is-active' : ''}${open ? '' : ' is-closed'}`}
                  onClick={() => setActiveDay(i)}
                >
                  <span>{fmtDay(d.date, { weekday: 'short' }).replace('.', '')}</span>
                  <strong>{fmtDay(d.date, { day: 'numeric' })}</strong>
                </button>
              );
            })}
          </div>

          <div
            className={`week-grid${loading ? ' is-loading' : ''}`}
            style={{ '--cols': data.days.length }}
          >
            {data.days.map((d, i) => (
              <div key={d.date} className={`day-col${i === activeDay ? ' is-active' : ''}`}>
                <div className="day-head">
                  <span>{fmtDay(d.date, { weekday: 'long' })}</span>
                  <strong>{fmtDay(d.date, { day: 'numeric', month: 'short' }).replace('.', '')}</strong>
                </div>
                <div className="slots">
                  {d.slots.length === 0 && <p className="muted small">Sin horario</p>}
                  {d.slots.map((s) =>
                    s.available ? (
                      <button
                        key={s.start}
                        type="button"
                        className="slot slot-free"
                        onClick={() => setSlot(s.start)}
                        aria-label={`Agendar ${fmtLong(s.start, data.timezone)}`}
                      >
                        {fmtTime(s.start, data.timezone)}
                      </button>
                    ) : (
                      <span key={s.start} className="slot slot-busy" aria-label="No disponible">
                        {fmtTime(s.start, data.timezone)}
                      </span>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          {!loading && totalOpen === 0 && (
            <p className="notice">
              No hay espacios disponibles esta semana.
              {data.nextWeek && (
                <>
                  {' '}
                  <button type="button" className="link-btn" onClick={() => setWeek(data.nextWeek)}>
                    Ver la siguiente semana
                  </button>
                </>
              )}
            </p>
          )}
        </>
      )}

      {!error && !data && <div className="skeleton" aria-label="Cargando agenda" />}

      {slot && data && (
        <BookingModal
          start={slot}
          timeZone={data.timezone}
          onClose={(booked) => {
            setSlot(null);
            if (booked) load(week);
          }}
          onTaken={() => load(week)}
        />
      )}
    </section>
  );
}

function BookingModal({ start, timeZone, onClose, onTaken }) {
  const [form, setForm] = useState({ name: '', reason: '', contact: '', website: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const firstField = useRef(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e) => e.key === 'Escape' && !sending && onClose(done);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, sending, done]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, start }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) onTaken();
        throw new Error(json.error || 'No pudimos registrar tu cita.');
      }
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && !sending && onClose(done)}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button
          type="button"
          className="close"
          onClick={() => onClose(done)}
          disabled={sending}
          aria-label="Cerrar"
        >
          ×
        </button>

        {done ? (
          <div className="success">
            <div className="check" aria-hidden="true">✓</div>
            <h3 id="modal-title">¡Cita agendada!</h3>
            <p>
              Te esperamos el <strong>{fmtLong(start, timeZone)}</strong>.
            </p>
            <p className="muted">Sesión de 30 minutos con el Lic. Asaf Leocadio.</p>
            <button type="button" className="btn" onClick={() => onClose(true)}>
              Listo
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="eyebrow eyebrow-dark">Nueva cita · 30 min</p>
            <h3 id="modal-title">{fmtLong(start, timeZone)}</h3>

            <label className="field">
              <span>Nombre completo *</span>
              <input
                ref={firstField}
                value={form.name}
                onChange={update('name')}
                required
                minLength={3}
                maxLength={120}
                autoComplete="name"
                placeholder="Ej. María González López"
              />
            </label>

            <label className="field">
              <span>Motivo de la consulta *</span>
              <textarea
                value={form.reason}
                onChange={update('reason')}
                required
                minLength={5}
                maxLength={2000}
                rows={4}
                placeholder="Describe brevemente el asunto que quieres tratar"
              />
            </label>

            <label className="field">
              <span>
                Teléfono o correo <em>(opcional)</em>
              </span>
              <input
                value={form.contact}
                onChange={update('contact')}
                maxLength={150}
                autoComplete="tel"
                placeholder="Para poder contactarte si es necesario"
              />
            </label>

            <input
              className="hp"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={update('website')}
              aria-hidden="true"
            />

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="btn btn-block" disabled={sending}>
              {sending ? 'Agendando…' : 'Confirmar cita'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
