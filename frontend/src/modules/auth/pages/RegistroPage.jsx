import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, inicioPorRol } from '../../../shared/context/AuthContext.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';

// Registro del cliente (HU-07): el RUT debe estar previamente registrado por ENINTI.
export default function RegistroPage() {
  const { usuario, registro } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ rut: '', email: '', password: '', telefono: '' });
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={inicioPorRol(usuario.rol)} replace />;

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const u = await registro({ ...form, telefono: form.telefono.trim() || undefined });
      navigate(inicioPorRol(u.rol), { replace: true });
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
  }

  return (
    <main className="acceso">
      <div className="acceso-tarjeta">
        <h1 className="acceso-marca">Crear cuenta</h1>
        <p className="acceso-sub">Para clientes de ENINTI con instalación registrada</p>

        <form className="formulario-simple" onSubmit={enviar}>
          <Mensaje error={error} />
          <label>
            RUT
            <input name="rut" value={form.rut} onChange={cambiar} required placeholder="12345678-9" autoFocus />
          </label>
          <label>
            Correo electrónico
            <input name="email" type="email" value={form.email} onChange={cambiar} required autoComplete="username" />
          </label>
          <label>
            Contraseña <span className="opcional">(mínimo 8 caracteres)</span>
            <input name="password" type="password" value={form.password} onChange={cambiar} required minLength={8} autoComplete="new-password" />
          </label>
          <label>
            Teléfono <span className="opcional">(opcional)</span>
            <input name="telefono" value={form.telefono} onChange={cambiar} placeholder="+56912345678" />
          </label>
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Creando…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="acceso-pie">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
      </div>
    </main>
  );
}
