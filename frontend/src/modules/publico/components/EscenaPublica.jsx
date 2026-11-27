import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import LogoEninti from '../../../shared/components/LogoEninti.jsx';
import FondoSolar from '../../auth/components/FondoSolar.jsx';
import { CONTACTO, enlaceCorreo, enlaceTelefono } from '../../../shared/utils/contacto.js';

// Marco común de las páginas públicas (planes, contacto, solicitud de cuenta):
// la misma planta solar del login, barra con la página actual marcada y pie de contacto.
export default function EscenaPublica({ children, titulo }) {
  const escena = useRef(null);

  useEffect(() => {
    document.title = titulo ? `${titulo} · ENINTI` : 'ENINTI';
    window.scrollTo({ top: 0 }); // cada página pública parte desde arriba
  }, [titulo]);

  // Parallax suave del fondo (solo con mouse; el CSS lo anula con movimiento reducido)
  function moverPuntero(e) {
    if (e.pointerType !== 'mouse') return;
    escena.current?.style.setProperty('--px', (e.clientX / window.innerWidth - 0.5).toFixed(3));
    escena.current?.style.setProperty('--py', (e.clientY / window.innerHeight - 0.5).toFixed(3));
  }

  return (
    <div className="login publico" ref={escena} onPointerMove={moverPuntero}>
      <FondoSolar />
      <a className="pub-saltar" href="#contenido">Saltar al contenido</a>

      <header className="login-barra">
        <Link to="/login" className="login-barra-marca" aria-label="ENINTI, ir al inicio de sesión">
          <LogoEninti tamano={40} />
          <span aria-hidden="true">ENINTI</span>
        </Link>
        <nav className="login-barra-nav" aria-label="Accesos públicos">
          <NavLink to="/cotizador">Planes<span className="login-solo-amplio"> y servicios</span></NavLink>
          <NavLink to="/contacto">Contacto</NavLink>
          <NavLink to="/solicitar-cuenta" className="login-barra-cta">Solicitar cuenta</NavLink>
          <Link to="/login" className="pub-entrar">Iniciar sesión</Link>
        </nav>
      </header>

      <main id="contenido" className="pub-contenido">{children}</main>

      <footer className="login-piepagina">
        <span>© {new Date().getFullYear()} ENINTI · Energía solar y mantención · Región de Antofagasta</span>
        <a href={enlaceTelefono()}>{CONTACTO.telefono}</a>
        <a href={enlaceCorreo()}>{CONTACTO.correo}</a>
      </footer>
    </div>
  );
}

// Encabezado de página con la misma tipografía de portada del login
export function PortadaPublica({ etiqueta, titulo, destacado, children }) {
  return (
    <header className="pub-portada">
      {etiqueta && (
        <p className="login-etiqueta"><span className="login-punto" aria-hidden="true" /> {etiqueta}</p>
      )}
      <h1 className="login-titular">{titulo} {destacado && <span>{destacado}</span>}</h1>
      {children && <p className="pub-bajada">{children}</p>}
    </header>
  );
}
