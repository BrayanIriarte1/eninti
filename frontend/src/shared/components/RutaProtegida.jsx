import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, inicioPorRol } from '../context/AuthContext.jsx';

// Protege rutas por autenticación y rol. Sin sesión redirige a /login;
// con un rol no autorizado lleva al inicio del rol real.
export default function RutaProtegida({ roles }) {
  const { usuario, cargando } = useAuth();

  if (cargando) return <p className="contenido">Cargando…</p>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to={inicioPorRol(usuario.rol)} replace />;

  return <Outlet />;
}
