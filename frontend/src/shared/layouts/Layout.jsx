import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/sesion.js';
import Icono from '../components/Icono.jsx';
import LogoEninti from '../components/LogoEninti.jsx';

// Menú de navegación según el rol (RNF-10: cada perfil ve solo lo suyo).
// Cada grupo lleva un título solo cuando el rol tiene varios grupos.
const MENU = {
  administrador: [
    { grupo: null, items: [['/admin', 'Inicio', 'inicio', true]] },
    { grupo: 'Clientes y plantas', items: [
      ['/admin/plantas', 'Plantas', 'planta'],
      ['/admin/clientes', 'Clientes', 'clientes'],
      ['/admin/solicitudes-cuenta', 'Nuevas cuentas', 'nuevaCuenta'],
      ['/admin/solicitudes-suscripcion', 'Suscripciones', 'suscripcion'],
      ['/admin/cambios-datos', 'Cambios de datos', 'datos'],
    ] },
    { grupo: 'Mantención', items: [
      ['/admin/calendario', 'Calendario', 'calendario'],
      ['/admin/solicitudes', 'Solicitudes', 'solicitudes'],
      ['/admin/trabajadores', 'Trabajadores', 'trabajadores'],
    ] },
    { grupo: 'Finanzas', items: [
      ['/admin/impagos', 'Impagos', 'impagos'],
      ['/admin/pagos', 'Pagos del mes', 'pagos'],
      ['/admin/catalogo', 'Catálogo', 'catalogo'],
    ] },
    { grupo: 'Sistema', items: [
      ['/admin/correos', 'Correos', 'correo'],
      ['/admin/seguridad', 'Seguridad', 'candado'],
    ] },
  ],
  trabajador: [
    { grupo: null, items: [
      ['/trabajador/agenda', 'Mi agenda', 'agenda'],
      ['/trabajador/seguridad', 'Seguridad', 'candado'],
    ] },
  ],
  cliente: [
    { grupo: null, items: [
      ['/cliente/cuenta', 'Mi cuenta', 'cuenta'],
      ['/cliente/plantas', 'Mis plantas', 'planta'],
      ['/cliente/mantenciones', 'Mantenciones', 'mantenciones'],
      ['/cliente/solicitudes', 'Solicitudes', 'solicitudes'],
      ['/cliente/datos', 'Mis datos', 'datos'],
    ] },
  ],
};

const ROL = { administrador: 'Administración', trabajador: 'Técnico en terreno', cliente: 'Cliente' };
const PANEL = { administrador: 'Panel de administración', trabajador: 'Panel del técnico', cliente: 'Portal del cliente' };

// Pantallas de detalle que no tienen entrada propia en el menú: cuelgan de otra sección
const SECCION_PADRE = { '/trabajador/ordenes': '/trabajador/agenda' };

// Sección actual según la ruta: la del menú que mejor coincide (la más larga)
function seccionActual(grupos, pathname) {
  for (const [prefijo, padre] of Object.entries(SECCION_PADRE)) {
    if (pathname.startsWith(`${prefijo}/`)) pathname = `${padre}/detalle`;
  }
  let mejor = null;
  for (const g of grupos) {
    for (const [ruta, texto, icono] of g.items) {
      if ((pathname === ruta || pathname.startsWith(`${ruta}/`)) && (!mejor || ruta.length > mejor.ruta.length)) {
        mejor = { ruta, texto, icono, grupo: g.grupo };
      }
    }
  }
  return mejor;
}

export default function Layout() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);
  const grupos = MENU[usuario?.rol] ?? [];
  const items = grupos.flatMap((g) => g.items);
  const conPestanas = usuario?.rol === 'cliente';

  // El menú móvil se cierra al navegar y con la tecla Escape
  useEffect(() => { setAbierto(false); }, [pathname]);
  useEffect(() => {
    if (!abierto) return undefined;
    const cerrar = (e) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('keydown', cerrar);
    document.body.classList.add('sin-scroll');
    return () => { window.removeEventListener('keydown', cerrar); document.body.classList.remove('sin-scroll'); };
  }, [abierto]);

  function salir() {
    cerrarSesion();
    navigate('/login', { replace: true });
  }

  const seccion = seccionActual(grupos, pathname);
  const detalle = seccion && pathname !== seccion.ruta; // p. ej. ficha de una planta u orden
  const hoy = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  const tituloSeccion = seccion?.texto;
  useEffect(() => {
    document.title = tituloSeccion ? `${tituloSeccion} · ENINTI` : 'ENINTI';
    return () => { document.title = 'ENINTI · Mantención solar'; }; // al salir del panel
  }, [tituloSeccion]);
  const iniciales = (usuario?.nombre ?? '?').split(' ').slice(0, 2).map((p) => p[0]).join('');

  return (
    <div className={`layout ${conPestanas ? 'layout-pestanas' : ''}`}>
      <header className="barra-movil">
        <span className="lateral-marca"><LogoEninti tamano={34} /><strong>ENINTI</strong></span>
        {items.length > 1 && !conPestanas ? (
          <button type="button" className="boton-icono" onClick={() => setAbierto(true)} aria-label="Abrir menú" aria-expanded={abierto} aria-controls="menu-lateral">
            <Icono nombre="menu" tamano={24} />
          </button>
        ) : (
          <button type="button" className="boton-icono" onClick={salir} aria-label="Cerrar sesión">
            <Icono nombre="salir" tamano={22} />
          </button>
        )}
      </header>

      <div className={`velo ${abierto ? 'visible' : ''}`} onClick={() => setAbierto(false)} aria-hidden="true" />

      <aside id="menu-lateral" className={`lateral ${abierto ? 'abierto' : ''}`}>
        <div className="lateral-cabeza">
          <span className="lateral-marca">
            <LogoEninti tamano={40} animado />
            <span>
              <strong>ENINTI</strong>
              <small>{PANEL[usuario?.rol]}</small>
            </span>
          </span>
          <button type="button" className="boton-icono solo-movil" onClick={() => setAbierto(false)} aria-label="Cerrar menú">
            <Icono nombre="cerrar" tamano={22} />
          </button>
        </div>
        <nav aria-label="Secciones" className="lateral-nav">
          {grupos.map((g) => (
            <div key={g.grupo ?? 'principal'} className="lateral-grupo">
              {g.grupo && grupos.length > 1 && <p className="lateral-titulo">{g.grupo}</p>}
              {g.items.map(([ruta, texto, icono, exacta]) => (
                <NavLink key={ruta} to={ruta} end={exacta}>
                  <Icono nombre={icono} />
                  <span>{texto}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="lateral-usuario">
          <span className="avatar" aria-hidden="true">{iniciales}</span>
          <span className="lateral-nombre">
            <strong>{usuario?.nombre}</strong>
            <small>{ROL[usuario?.rol]}</small>
          </span>
          <button type="button" className="boton-icono" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión">
            <Icono nombre="salir" />
          </button>
        </div>
      </aside>

      <main className="contenido">
        <div className="panel-barra">
          <nav aria-label="Ubicación" className="migas">
            <span>{PANEL[usuario?.rol]}</span>
            {seccion?.grupo && <><Icono nombre="flecha" tamano={14} /><span>{seccion.grupo}</span></>}
            {seccion && (
              <>
                <Icono nombre="flecha" tamano={14} />
                {detalle ? <NavLink to={seccion.ruta} end>{seccion.texto}</NavLink> : <span aria-current="page">{seccion.texto}</span>}
              </>
            )}
            {detalle && <><Icono nombre="flecha" tamano={14} /><span aria-current="page">Detalle</span></>}
          </nav>
          <span className="panel-fecha"><Icono nombre="calendario" tamano={16} />{hoy}</span>
        </div>
        <Suspense fallback={<p className="cargando">Cargando…</p>}>
          <Outlet />
        </Suspense>
      </main>

      {conPestanas && (
        <nav className="pestanas" aria-label="Secciones">
          {items.map(([ruta, texto, icono]) => (
            <NavLink key={ruta} to={ruta}>
              <Icono nombre={icono} tamano={22} />
              <span>{texto}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
