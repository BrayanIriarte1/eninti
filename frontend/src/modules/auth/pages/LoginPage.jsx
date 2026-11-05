import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, inicioPorRol } from '../../../shared/context/AuthContext.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';

export default function LoginPage() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <main className="acceso">
      <div className="acceso-tarjeta">
        <h1 className="acceso-marca">ENINTI</h1>
        <p className="acceso-sub">Plataforma de suscripciones y mantención solar</p>

        <form className="formulario-simple" onSubmit={enviar}>
          <Mensaje error={error} />
          <label>
            Correo electrónico
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" autoFocus />
          </label>
          <label>
            Contraseña
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="acceso-pie">
          ¿Eres cliente y aún no tienes cuenta? <Link to="/registro">Regístrate aquí</Link>
        </p>
        <p className="acceso-pie"><Link to="/cotizador">Ver planes y servicios</Link></p>
      </div>
    </main>
  );
}
