import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Menú de navegación según el rol (RNF-10: cada perfil ve solo lo suyo)
const MENU = {
  administrador: [
    ['/admin/plantas', 'Plantas'],
    ['/admin/clientes', 'Clientes'],
    ['/admin/trabajadores', 'Trabajadores'],
    ['/admin/calendario', 'Calendario'],
    ['/admin/solicitudes', 'Solicitudes'],
    ['/admin/impagos', 'Impagos'],
    ['/admin/pagos', 'Pagos del mes'],
    ['/admin/catalogo', 'Catálogo'],
  ],
  trabajador: [
    ['/trabajador/agenda', 'Mi agenda'],
  ],
  cliente: [
    ['/cliente/cuenta', 'Mi cuenta'],
    ['/cliente/plantas', 'Mis plantas'],
    ['/cliente/mantenciones', 'Mantenciones'],
    ['/cliente/solicitudes', 'Solicitudes'],
  ],
};

export default function Layout() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const menu = MENU[usuario?.rol] ?? [];

  function salir() {
    cerrarSesion();
    navigate('/login', { replace: true });
  }

  return (
    <div className="layout">
      <header className="topbar">
        <span className="marca">ENINTI</span>
        <nav aria-label="Secciones">
          {menu.map(([ruta, texto]) => (
            <NavLink key={ruta} to={ruta}>{texto}</NavLink>
          ))}
        </nav>
        <div className="topbar-usuario">
          <span className="topbar-nombre">{usuario?.nombre}</span>
          <button type="button" className="boton-salir" onClick={salir}>Salir</button>
        </div>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
