import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, inicioPorRol } from '../../../shared/context/AuthContext.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import LogoEninti from '../../../shared/components/LogoEninti.jsx';
import FondoSolar from '../components/FondoSolar.jsx';
import { CONTACTO as CONTACTO_ENINTI, enlaceWhatsapp } from '../../../shared/utils/contacto.js';

// Lo que cada perfil encuentra tras iniciar sesión (inicio de sesión unificado, CU-03)
const PERFILES = [
  { icono: <IconoCasa />, titulo: 'Clientes', texto: 'Estado de cuenta, cuotas, ficha de tus plantas e inscripción del medio de pago.' },
  { icono: <IconoHerramienta />, titulo: 'Técnicos', texto: 'Agenda del día y cierre de visitas desde el celular, con alertas de baterías.' },
  { icono: <IconoPanel />, titulo: 'Administración', texto: 'Plantas, calendario, asignación de órdenes, cobros y catálogo de planes.' },
];

const CONTACTO = { ...CONTACTO_ENINTI, whatsapp: enlaceWhatsapp() };

function saludo() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// Pantalla de acceso común a los tres perfiles (CU-03 / HU-07): tras validar,
// redirige al panel del rol. Sin autorregistro: el cliente contacta al administrador.
export default function LoginPage() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const escena = useRef(null);
  const cuadro = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [mayusculas, setMayusculas] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [sacudir, setSacudir] = useState(false);

  if (usuario) return <Navigate to={inicioPorRol(usuario.rol)} replace />;

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const u = await login(email, password);
      navigate(inicioPorRol(u.rol), { replace: true });
    } catch (err) {
      // Se conserva lo escrito para que el usuario solo corrija (RNF-01)
      setError(err);
      setEnviando(false);
      setSacudir(true);
    }
  }

  // Parallax del fondo e inclinación del cuadro según el puntero (solo mouse;
  // el CSS lo anula en pantallas táctiles y con movimiento reducido)
  function moverPuntero(e) {
    if (e.pointerType !== 'mouse') return;
    const px = e.clientX / window.innerWidth - 0.5;
    const py = e.clientY / window.innerHeight - 0.5;
    escena.current?.style.setProperty('--px', px.toFixed(3));
    escena.current?.style.setProperty('--py', py.toFixed(3));

    const r = cuadro.current?.getBoundingClientRect();
    if (!r) return;
    const dentro = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cuadro.current.style.setProperty('--mx', `${x * 100}%`);
    cuadro.current.style.setProperty('--my', `${y * 100}%`);
    cuadro.current.style.setProperty('--ry', dentro ? `${(x - 0.5) * 6}deg` : '0deg');
    cuadro.current.style.setProperty('--rx', dentro ? `${(0.5 - y) * 6}deg` : '0deg');
  }

  // Brillo que sigue al puntero dentro de cada tarjeta de perfil
  function brilloTarjeta(e) {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--tx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--ty', `${e.clientY - r.top}px`);
  }

  function revisarMayusculas(e) {
    if (e.getModifierState) setMayusculas(e.getModifierState('CapsLock'));
  }

  return (
    <div className="login" ref={escena} onPointerMove={moverPuntero}>
      <FondoSolar />

      <header className="login-barra">
        <span className="login-barra-marca">
          <LogoEninti tamano={40} />
          <span>ENINTI</span>
        </span>
        <nav className="login-barra-nav" aria-label="Accesos públicos">
          <Link to="/cotizador">Planes<span className="login-solo-amplio"> y servicios</span></Link>
          <Link to="/contacto">Contacto</Link>
          <Link to="/solicitar-cuenta" className="login-barra-cta">Solicitar cuenta</Link>
        </nav>
      </header>

      <main className="login-escena">
        <section className="login-hero" aria-labelledby="login-titular">
          <LogoEninti tamano={132} animado className="login-logo" />
          <p className="login-etiqueta">
            <span className="login-punto" aria-hidden="true" /> Mantención solar por suscripción
          </p>
          <h1 id="login-titular" className="login-titular">
            Tu planta solar, <span>siempre en marcha.</span>
          </h1>
          <p className="login-bajada">
            Una sola plataforma para clientes, técnicos y administración de ENINTI: mantenciones
            programadas, historial técnico por planta y pagos al día.
          </p>
        </section>

        <div
          ref={cuadro}
          className={`login-cuadro ${sacudir ? 'sacudir' : ''}`}
          onAnimationEnd={(e) => e.target === e.currentTarget && setSacudir(false)}
        >
          <section className="login-formulario" aria-labelledby="login-h2">
            <LogoEninti tamano={56} className="login-formulario-logo" />
            <p className="login-saludo">{saludo()}</p>
            <h2 id="login-h2">Inicia sesión</h2>
            <p className="login-indicacion">Te llevaremos directo al panel de tu perfil.</p>

            <form className="formulario-simple" onSubmit={enviar}>
              <Mensaje error={error} />

              <div className="login-grupo">
                <label htmlFor="login-email">Correo electrónico</label>
                <div className="login-campo">
                  <IconoCorreo />
                  <input
                    id="login-email"
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                    autoFocus
                    placeholder="nombre@correo.cl"
                  />
                </div>
              </div>

              <div className="login-grupo">
                <label htmlFor="login-password">Contraseña</label>
                <div className="login-campo">
                  <IconoCandado />
                  <input
                    id="login-password"
                    type={verPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={revisarMayusculas}
                    onKeyDown={revisarMayusculas}
                    required
                    autoComplete="current-password"
                    aria-describedby="login-mayus"
                  />
                  <button
                    type="button"
                    className="login-ver"
                    onClick={() => setVerPassword((v) => !v)}
                    aria-pressed={verPassword}
                    aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {verPassword ? <IconoOjoTachado /> : <IconoOjo />}
                  </button>
                </div>
                <p id="login-mayus" className="login-mayus" aria-live="polite">
                  {mayusculas ? 'Bloq Mayús está activado' : ''}
                </p>
              </div>

              <button type="submit" className="login-entrar" disabled={enviando} aria-busy={enviando}>
                {enviando && <span className="login-giro" aria-hidden="true" />}
                {enviando ? 'Entrando…' : 'Entrar'}
                {!enviando && <IconoFlecha />}
              </button>
            </form>

            <p className="login-pie">
              ¿Aún no tienes cuenta? <Link to="/solicitar-cuenta">Solicítala aquí</Link>
              <br />
              ¿No puedes entrar? <Link to="/contacto">Contacta al administrador</Link>
            </p>

            <div className="login-contacto">
              <p id="login-ayuda">¿Necesitas ayuda? Escríbenos</p>
              <ul aria-labelledby="login-ayuda">
                <li>
                  <a className="login-red instagram" href={CONTACTO.instagram} target="_blank" rel="noopener noreferrer">
                    <span className="login-red-icono"><IconoInstagram /></span>
                    Instagram<span className="login-oculto"> (abre en otra pestaña)</span>
                  </a>
                </li>
                <li>
                  <a className="login-red whatsapp" href={CONTACTO.whatsapp} target="_blank" rel="noopener noreferrer">
                    <span className="login-red-icono"><IconoWhatsapp /></span>
                    WhatsApp<span className="login-oculto"> {CONTACTO.telefono} (abre en otra pestaña)</span>
                  </a>
                </li>
                <li>
                  <a className="login-red correo" href={`mailto:${CONTACTO.correo}`}>
                    <span className="login-red-icono"><IconoCorreo /></span>
                    Correo<span className="login-oculto"> {CONTACTO.correo}</span>
                  </a>
                </li>
              </ul>
            </div>
          </section>
        </div>

        <ul className="login-perfiles" aria-label="Qué encuentra cada perfil">
          {PERFILES.map((p) => (
            <li key={p.titulo} className="login-perfil" onPointerMove={brilloTarjeta}>
              <span className="login-perfil-icono">{p.icono}</span>
              <span>
                <strong>{p.titulo}</strong>
                <span className="login-perfil-texto">{p.texto}</span>
              </span>
            </li>
          ))}
        </ul>
      </main>

      <footer className="login-piepagina">
        <span>© {new Date().getFullYear()} ENINTI · Energía solar y mantención</span>
        <a href={`tel:${CONTACTO.telefono.replace(/\s/g, '')}`}>{CONTACTO.telefono}</a>
        <a href={`mailto:${CONTACTO.correo}`}>{CONTACTO.correo}</a>
      </footer>
    </div>
  );
}

// Íconos decorativos (el texto visible ya nombra cada elemento)
function Icono({ children }) {
  return (
    <svg className="login-icono" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}
function IconoCorreo() { return <Icono><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Icono>; }
function IconoCandado() { return <Icono><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Icono>; }
function IconoOjo() { return <Icono><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Icono>; }
function IconoOjoTachado() { return <Icono><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="m2 2 20 20" /></Icono>; }
function IconoCasa() { return <Icono><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></Icono>; }
function IconoHerramienta() { return <Icono><path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8" /><path d="M14.7 6.3 13 4.6a4 4 0 0 0-5.6 5.6l1.3 1.3L3 17.2V21h3.8l5.7-5.7" /></Icono>; }
function IconoPanel() { return <Icono><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></Icono>; }
function IconoFlecha() { return <Icono><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Icono>; }
function IconoInstagram() { return <Icono><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></Icono>; }
function IconoWhatsapp() {
  return (
    <Icono>
      <path d="M3.5 20.5 4.8 16.3A8.5 8.5 0 1 1 8 19.4Z" />
      <path d="M9 8.2c-.5 0-.9.5-.9 1.2 0 2.6 3.4 6 6 6 .7 0 1.2-.4 1.2-.9v-1l-2-.9-.8.9a5 5 0 0 1-2.7-2.7l.9-.8-.9-2Z" fill="currentColor" stroke="none" />
    </Icono>
  );
}
