// ============================================================================
// PANTALLA: Seguridad · URL /admin/seguridad y /trabajador/seguridad · Rol: administrador y trabajador
// Casos de uso: CU-26 cambiar contraseña
// Datos: CambiarContrasena → authService.cambiarContrasena() → contrasena.service.js · cambiar()
// Patrón: useState (datos/error) → cargar() pide a la API → render. Tras guardar, se vuelve a cargar().
// Los textos que ves en pantalla están en el JSX de abajo; las reglas están en el backend.
// ============================================================================
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
