import Scheduler from '@/components/Scheduler';

export default function Home() {
  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="eyebrow">Agenda de consultas</p>
          <h1>
            Lic. Asaf <span>Leocadio</span>
          </h1>
          <p className="lead">
            Elige un horario disponible y agenda una sesión de 30 minutos. Tu cita queda
            registrada al instante.
          </p>
          <ul className="facts">
            <li>Sesiones de 30 minutos</li>
            <li>Hora del centro de México</li>
            <li>Confirmación inmediata</li>
          </ul>
        </div>
      </header>

      <main className="main">
        <Scheduler />
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} Lic. Asaf Leocadio</p>
      </footer>
    </>
  );
}
