// ============================================================================
// PANTALLA: Recuperar contraseña · URL /recuperar · Rol: público
// Casos de uso: CU-27 (paso 1: pedir enlace)
// Datos: recuperarContrasena() → POST /api/auth/recuperar → contrasena.service.js · solicitar()
// Patrón: useState (datos/error) → cargar() pide a la API → render. Tras guardar, se vuelve a cargar().
// Los textos que ves en pantalla están en el JSX de abajo; las reglas están en el backend.
// ============================================================================
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import EscenaPublica from '../../publico/components/EscenaPublica.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import LogoEninti from '../../../shared/components/LogoEninti.jsx';
import { IconoCorreo, IconoFlecha, IconoVolver } from '../../publico/components/IconosPublicos.jsx';
import { recuperarContrasena } from '../services/authService.js';

// «¿Olvidaste tu contraseña?»: pide un enlace de un solo uso por correo.
// La respuesta es la misma exista o no la cuenta, para no revelar quién es cliente.
export default function RecuperarPage() {
  const { state } = useLocation();
  const [email, setEmail] = useState(state?.email ?? '');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [respuesta, setRespuesta] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      setRespuesta(await recuperarContrasena(email));
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <EscenaPublica titulo="Recuperar contraseña">
      <div className="cuadro-luz acceso-cuadro">
        <section className="acceso-caja" aria-labelledby="recuperar-titulo">
          <LogoEninti tamano={52} className="acceso-logo" />
          {respuesta ? (
            <div className="acceso-exito" role="status">
              <span className="sol-exito-icono"><IconoCorreo tamano={36} /></span>
              <h1 id="recuperar-titulo">Revisa tu correo</h1>
              <p>{respuesta.mensaje}</p>
              <p className="texto-suave">El enlace vence en 1 hora y sirve una sola vez.</p>
              <Link className="login-entrar" to="/login">Volver a iniciar sesión <IconoFlecha /></Link>
              <button type="button" className="enlace-boton" onClick={() => setRespuesta(null)}>No me llegó: enviar otra vez</button>
            </div>
          ) : (
            <>
              <h1 id="recuperar-titulo">¿Olvidaste tu contraseña?</h1>
              <p className="acceso-indicacion">
                Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva.
              </p>
              <form className="formulario-simple" onSubmit={enviar}>
                <Mensaje error={error} />
                <div className="login-grupo">
                  <label htmlFor="recuperar-email">Correo electrónico</label>
                  <div className="login-campo">
                    <IconoCorreo />
                    <input id="recuperar-email" type="email" inputMode="email" value={email}
                      onChange={(e) => setEmail(e.target.value)} required autoComplete="username" autoFocus placeholder="nombre@correo.cl" />
                  </div>
                </div>
                <button type="submit" className="login-entrar" disabled={enviando} aria-busy={enviando}>
                  {enviando && <span className="login-giro" aria-hidden="true" />}
                  {enviando ? 'Enviando…' : 'Enviar enlace'}
                  {!enviando && <IconoFlecha />}
                </button>
              </form>
              <p className="acceso-pie">
                <Link to="/login"><IconoVolver tamano={16} /> Volver a iniciar sesión</Link>
              </p>
              <p className="acceso-nota">
                ¿Ya no tienes acceso a ese correo? <Link to="/contacto">Contacta al administrador</Link>.
              </p>
            </>
          )}
        </section>
      </div>
    </EscenaPublica>
  );
}
