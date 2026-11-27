// CAPA SERVICIO · Cambiar contraseña (CU-26) y recuperarla por correo (CU-27).
// Las reglas de la contraseña están en shared/utils/password.js (erroresContrasena).
import { createHash, randomBytes } from 'node:crypto';
import { query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import { erroresContrasena, hashPassword, verificarPassword } from '../../shared/utils/password.js';
import { enTransaccion } from '../../shared/utils/transaccion.js';
import { enviarAviso, enSegundoPlano } from '../notificaciones/correo.service.js';
import { firmarToken, limpiarIntentos } from './auth.service.js';

// Cambio y recuperación de contraseña (RNF-10, OWASP):
//   · Cambiar exige la contraseña actual y devuelve un token nuevo; las demás sesiones se cierran.
//   · Recuperar responde siempre lo mismo, exista o no el correo (no revela quién tiene cuenta).
//   · El enlace lleva un token aleatorio de 256 bits; la base guarda solo su SHA-256,
//     vence en 1 hora y sirve una sola vez.
export const VIGENCIA_MIN = 60;
const RESPUESTA_RECUPERAR = {
  mensaje: 'Si el correo pertenece a una cuenta activa, te enviamos un enlace para restablecer tu contraseña. Revisa también tu carpeta de spam.',
};

// Las reglas viven en shared/utils/password.js (las comparten las cuentas que crea el admin)
export { erroresContrasena };

function validarNueva(nueva) {
  const errores = erroresContrasena(nueva);
  if (errores.length) throw new HttpError(400, 'La contraseña nueva no cumple los requisitos', errores);
}

export const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex');
const tokenConFormato = (t) => typeof t === 'string' && /^[A-Za-z0-9_-]{43}$/.test(t);

// [CU-26]
// Cambiar la contraseña con la sesión iniciada (cualquier rol)
export async function cambiar(idUsuario, { actual, nueva }) {
  if (typeof actual !== 'string' || !actual) throw new HttpError(400, 'Indica tu contraseña actual');
  validarNueva(nueva);
  if (actual === nueva) throw new HttpError(400, 'La contraseña nueva debe ser distinta de la actual');

  const { rows } = await query('SELECT id_usuario, rol, email, nombre, password_hash FROM usuario WHERE id_usuario = $1', [idUsuario]);
  const usuario = rows[0];
  if (!usuario) throw new HttpError(404, 'Usuario no encontrado');
  // 400 y no 401: un 401 cerraría la sesión en el navegador por un simple error de tipeo
  if (!(await verificarPassword(actual, usuario.password_hash))) {
    throw new HttpError(400, 'La contraseña actual no es correcta');
  }

  await enTransaccion(async (conexion) => {
    await conexion.query(
      'UPDATE usuario SET password_hash = $2, password_actualizado = now() WHERE id_usuario = $1',
      [idUsuario, await hashPassword(nueva)],
    );
    // Un enlace de recuperación pendiente ya no corresponde
    await conexion.query(
      'UPDATE recuperacion_contrasena SET usado = now() WHERE id_usuario = $1 AND usado IS NULL',
      [idUsuario],
    );
  });

  enSegundoPlano(avisarCambio(usuario));
  // Token nuevo: esta sesión sigue abierta, las demás dejan de valer
  return { mensaje: 'Contraseña actualizada', token: firmarToken(usuario) };
}

// [CU-27] paso 1
// Pedir un enlace de recuperación por correo
export async function solicitar(email) {
  const correo = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new HttpError(400, 'Indica un correo válido');

  const { rows } = await query(
    'SELECT id_usuario, nombre, email FROM usuario WHERE lower(email) = $1 AND activo',
    [correo],
  );
  if (rows.length) {
    const usuario = rows[0];
    const token = randomBytes(32).toString('base64url'); // 43 caracteres
    await enTransaccion(async (conexion) => {
      // Solo el último enlace sirve
      await conexion.query(
        'UPDATE recuperacion_contrasena SET usado = now() WHERE id_usuario = $1 AND usado IS NULL',
        [usuario.id_usuario],
      );
      await conexion.query(
        `INSERT INTO recuperacion_contrasena (id_usuario, token_hash, expira)
         VALUES ($1, $2, now() + make_interval(mins => $3))`,
        [usuario.id_usuario, hashToken(token), VIGENCIA_MIN],
      );
    });
    // En segundo plano: la respuesta tarda lo mismo exista o no la cuenta
    enSegundoPlano(enviarAviso({
      para: usuario.email,
      asunto: 'Restablece tu contraseña de ENINTI',
      motivo: 'recuperar_contrasena',
      lineas: [
        `Hola ${usuario.nombre.split(' ')[0]}:`,
        'Recibimos una solicitud para restablecer la contraseña de tu cuenta ENINTI. Usa el botón para crear una nueva.',
        `El enlace vence en ${VIGENCIA_MIN} minutos y sirve una sola vez.`,
        'Si no lo pediste, ignora este correo: tu contraseña no cambiará.',
      ],
      accion: { texto: 'Crear contraseña nueva', url: `${process.env.APP_URL ?? ''}/restablecer?token=${token}` },
    }));
  }
  return RESPUESTA_RECUPERAR;
}

// Busca un enlace vigente; con conexión de transacción lo bloquea para usarlo
async function enlaceVigente(conexion, token, bloquear = false) {
  if (!tokenConFormato(token)) return null;
  const { rows } = await conexion.query(
    `SELECT r.id_recuperacion, u.id_usuario, u.email, u.nombre, u.rol
     FROM recuperacion_contrasena r
     JOIN usuario u ON u.id_usuario = r.id_usuario AND u.activo
     WHERE r.token_hash = $1 AND r.usado IS NULL AND r.expira > now()
     ${bloquear ? 'FOR UPDATE OF r' : ''}`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

// Correo parcialmente oculto, para confirmar a quién pertenece el enlace sin exponerlo
export function ocultarCorreo(email) {
  const [nombre, dominio] = String(email).split('@');
  if (!dominio) return '';
  const visible = nombre.length <= 2 ? nombre[0] : nombre.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(3, nombre.length - visible.length))}@${dominio}`;
}

// [CU-27] ¿el enlace sigue vigente?
// Revisar el enlace antes de mostrar el formulario
export async function verificar(token) {
  const enlace = await enlaceVigente({ query }, token);
  if (!enlace) return { valido: false };
  return { valido: true, email: ocultarCorreo(enlace.email) };
}

// [CU-27] paso 2
// Crear la contraseña nueva con el enlace
export async function restablecer({ token, nueva }) {
  validarNueva(nueva);
  const usuario = await enTransaccion(async (conexion) => {
    const enlace = await enlaceVigente(conexion, token, true);
    if (!enlace) throw new HttpError(400, 'El enlace no es válido o ya venció. Pide uno nuevo');
    await conexion.query(
      'UPDATE usuario SET password_hash = $2, password_actualizado = now() WHERE id_usuario = $1',
      [enlace.id_usuario, await hashPassword(nueva)],
    );
    await conexion.query(
      'UPDATE recuperacion_contrasena SET usado = now() WHERE id_usuario = $1 AND usado IS NULL',
      [enlace.id_usuario],
    );
    return enlace;
  });

  limpiarIntentos(usuario.email); // si estaba bloqueado por intentos fallidos, ya puede entrar
  enSegundoPlano(avisarCambio(usuario));
  return { mensaje: 'Tu contraseña fue restablecida. Ya puedes iniciar sesión' };
}

// Aviso de seguridad: si no fue el titular, sabe que debe actuar
function avisarCambio(usuario) {
  return enviarAviso({
    para: usuario.email,
    asunto: 'Tu contraseña de ENINTI cambió',
    motivo: 'contrasena_cambiada',
    lineas: [
      `Hola ${usuario.nombre.split(' ')[0]}:`,
      `La contraseña de tu cuenta ENINTI se cambió el ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'long', timeStyle: 'short' })} (hora de Chile).`,
      'Por seguridad cerramos las demás sesiones abiertas.',
      'Si no fuiste tú, restablécela de inmediato desde "¿Olvidaste tu contraseña?" y escríbenos a contacto@eninti.cl.',
    ],
  });
}
