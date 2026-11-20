import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, inicioPorRol } from '../../../shared/context/AuthContext.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import Icono from '../../../shared/components/Icono.jsx';
import Marca from '../../../shared/components/Marca.jsx';

// Paisaje del panel izquierdo: sol sobre cerros y una fila de paneles solares
function Paisaje() {
  return (
    <svg className="login-paisaje" viewBox="0 0 560 300" aria-hidden="true">
      <circle cx="380" cy="120" r="70" fill="#f5b301" opacity="0.12" />
      <circle cx="380" cy="120" r="40" fill="#f5b301" />
      <path d="M0 230 L90 190 L150 206 L230 160 L310 200 L380 178 L460 196 L560 170 L560 300 L0 300 Z" fill="#1d3550" />
      <path d="M0 262 L120 240 L260 254 L400 236 L560 250 L560 300 L0 300 Z" fill="#152a42" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${70 + i * 112} 222)`}>
          <path d="M0 40 L18 0 H96 L78 40 Z" fill="#2f6fa6" stroke="#0f1d2e" strokeWidth="2" />
          <path d="M24 0 L6 40 M48 0 L30 40 M72 0 L54 40 M9 20 H87" stroke="#0f1d2e" strokeWidth="1.5" />
          <path d="M44 40 V60" stroke="#0f1d2e" strokeWidth="4" />
        </g>
      ))}
    </svg>
  );
}

export default function LoginPage() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={inicioPorRol(usuario.rol)} replace />;

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const u = await login(email, password);
      navigate(inicioPorRol(u.rol), { replace: true });
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
  }

  return (
    <main className="login">
      <section className="login-historia">
        <div>
          <Marca />
          <h1 style={{ marginTop: '2.5rem' }}>Tu planta solar, al día.</h1>
          <p>Mantención preventiva por suscripción para plantas solares de la Región de Antofagasta.</p>
        </div>
        <ul className="login-lista">
          <li><Icono nombre="cuenta" /><span><strong>Tu cuenta clara</strong>Cuotas, pagos y deuda en una sola pantalla.</span></li>
          <li><Icono nombre="mantenciones" /><span><strong>Mantención cuando la necesitas</strong>Pide una visita y sigue su estado.</span></li>
          <li><Icono nombre="planta" /><span><strong>La ficha de tu planta</strong>Equipos, potencia e historial de visitas.</span></li>
        </ul>
        <Paisaje />
      </section>

      <section className="login-form">
        <h2>Inicia sesión</h2>
        <p className="acceso-sub">Clientes, técnicos y administración entran por aquí.</p>

        <form className="formulario-simple" onSubmit={enviar}>
          <Mensaje error={error} />
          <label>
            Correo electrónico
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" autoFocus placeholder="nombre@correo.cl" />
          </label>
          <label>
            Contraseña
            <span className="campo-clave">
              <input type={verClave ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              <button type="button" onClick={() => setVerClave(!verClave)} aria-pressed={verClave}>
                {verClave ? 'Ocultar' : 'Mostrar'}
              </button>
            </span>
          </label>
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="login-separador">¿Aún no eres cliente?</p>
        <div className="login-enlaces">
          <Link className="boton secundario" to="/solicitar-cuenta">Contacta al administrador</Link>
          <Link className="boton secundario" to="/cotizador">Ver planes y precios</Link>
        </div>
      </section>
    </main>
  );
}
