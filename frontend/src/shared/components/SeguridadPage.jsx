import CambiarContrasena from './CambiarContrasena.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Seguridad de la cuenta para administración y técnicos (el cliente la tiene en «Mis datos»)
export default function SeguridadPage() {
  const { usuario } = useAuth();
  return (
    <section>
      <div className="encabezado">
        <h1>Seguridad</h1>
      </div>
      <p className="texto-suave">Cuenta: <strong>{usuario?.email}</strong></p>
      <div className="columnas">
        <CambiarContrasena />
      </div>
    </section>
  );
}
