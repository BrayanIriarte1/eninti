import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import EscenaPublica from '../../publico/components/EscenaPublica.jsx';
import LogoEninti from '../../../shared/components/LogoEninti.jsx';
import FormularioContrasena from '../../../shared/components/FormularioContrasena.jsx';
import { IconoCheck, IconoFlecha } from '../../publico/components/IconosPublicos.jsx';
import { restablecerContrasena, verificarEnlace } from '../services/authService.js';

// Crear una contraseña nueva desde el enlace del correo (/restablecer?token=...).
// Antes de mostrar el formulario se revisa que el enlace siga vigente.
export default function RestablecerPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [enlace, setEnlace] = useState(null); // null = revisando
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!token) { setEnlace({ valido: false }); return; }
    verificarEnlace(token).then(setEnlace).catch(() => setEnlace({ valido: false }));
  }, [token]);

  async function guardar({ nueva }) {
    await restablecerContrasena(token, nueva);
    setListo(true);
  }

  let contenido;
  if (!enlace) {
    contenido = <p className="cargando">Revisando el enlace…</p>;
  } else if (listo) {
    contenido = (
      <div className="acceso-exito" role="status">
        <span className="sol-exito-icono"><IconoCheck tamano={40} /></span>
        <h1 id="restablecer-titulo">Contraseña creada</h1>
        <p>Ya puedes iniciar sesión con tu contraseña nueva. Por seguridad cerramos las sesiones que tenías abiertas.</p>
        <Link className="login-entrar" to="/login">Iniciar sesión <IconoFlecha /></Link>
      </div>
    );
  } else if (!enlace.valido) {
    contenido = (
      <div className="acceso-exito">
        <h1 id="restablecer-titulo">El enlace no es válido</h1>
        <p>Puede que ya lo hayas usado, que haya vencido (dura 1 hora) o que hayas pedido otro más nuevo.</p>
        <Link className="login-entrar" to="/recuperar">Pedir un enlace nuevo <IconoFlecha /></Link>
        <Link to="/login">Volver a iniciar sesión</Link>
      </div>
    );
  } else {
    contenido = (
      <>
        <h1 id="restablecer-titulo">Crea tu contraseña nueva</h1>
        <p className="acceso-indicacion">Para la cuenta <strong>{enlace.email}</strong>.</p>
        <FormularioContrasena textoBoton="Guardar contraseña" claseBoton="login-entrar" onEnviar={guardar} />
      </>
    );
  }

  return (
    <EscenaPublica titulo="Restablecer contraseña">
      <div className="cuadro-luz acceso-cuadro">
        <section className="acceso-caja" aria-labelledby="restablecer-titulo" aria-live="polite">
          <LogoEninti tamano={52} className="acceso-logo" />
          {contenido}
        </section>
      </div>
    </EscenaPublica>
  );
}
