import { useState } from 'react';
import FormularioContrasena from './FormularioContrasena.jsx';
import Icono from './Icono.jsx';
import { cambiarContrasena } from '../../modules/auth/services/authService.js';
import { guardarToken } from '../utils/api.js';

// Tarjeta para cambiar la contraseña con la sesión iniciada (cualquier rol).
// La API devuelve un token nuevo: esta sesión sigue abierta y las demás se cierran.
export default function CambiarContrasena() {
  const [listo, setListo] = useState(false);

  async function guardar({ actual, nueva }) {
    setListo(false);
    const { token } = await cambiarContrasena(actual, nueva);
    guardarToken(token);
    setListo(true);
  }

  return (
    <article className="tarjeta tarjeta-contrasena">
      <div className="panel-titulo">
        <h2><Icono nombre="candado" tamano={20} /> Contraseña</h2>
      </div>
      <p className="texto-suave">
        Al cambiarla cerramos tus otras sesiones abiertas y te avisamos por correo.
      </p>
      {listo && <p className="mensaje-ok" role="status">Listo: tu contraseña fue actualizada.</p>}
      <FormularioContrasena pedirActual textoBoton="Cambiar contraseña" onEnviar={guardar} />
    </article>
  );
}
