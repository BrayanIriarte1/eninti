import jwt from 'jsonwebtoken';
import { query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import { verificarPassword } from '../../shared/utils/password.js';

const DURACION_SESION = '8h';
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

// Intentos fallidos por correo (RNF-10). En memoria: suficiente para un solo proceso.
const intentos = new Map();

function verificarBloqueo(email) {
  const registro = intentos.get(email);
  if (registro?.bloqueadoHasta > Date.now()) {
    throw new HttpError(429, 'Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos');
  }
}

function registrarFallo(email) {
  const registro = intentos.get(email) ?? { fallos: 0, bloqueadoHasta: 0 };
  registro.fallos += 1;
  if (registro.fallos >= MAX_INTENTOS) {
    registro.bloqueadoHasta = Date.now() + BLOQUEO_MS;
    registro.fallos = 0;
  }
  intentos.set(email, registro);
}

const firmarToken = (usuario) =>
  jwt.sign({ id: usuario.id_usuario, rol: usuario.rol }, process.env.JWT_SECRET, {
    expiresIn: DURACION_SESION,
  });

// El mensaje de error nunca revela si falló el correo o la contraseña (HU-07)
export async function login(email, password) {
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    throw new HttpError(400, 'Indica correo y contraseña');
  }
  const correo = email.trim().toLowerCase();
  verificarBloqueo(correo);

  const { rows } = await query('SELECT * FROM usuario WHERE lower(email) = $1', [correo]);
  const usuario = rows[0];
  const valida = usuario ? await verificarPassword(password, usuario.password_hash) : false;

  if (!usuario || !valida || !usuario.activo) {
    registrarFallo(correo);
    throw new HttpError(401, 'Credenciales incorrectas o cuenta inactiva');
  }

  intentos.delete(correo);
  await query('UPDATE usuario SET ultimo_acceso = now() WHERE id_usuario = $1', [usuario.id_usuario]);

  return {
    token: firmarToken(usuario),
    usuario: { id: usuario.id_usuario, nombre: usuario.nombre, rol: usuario.rol, email: usuario.email },
  };
}

export async function perfil(idUsuario) {
  const { rows } = await query(
    `SELECT u.id_usuario, u.nombre, u.email, u.rol, u.telefono, u.ultimo_acceso,
            c.id_cliente, c.rut
     FROM usuario u
     LEFT JOIN cliente c ON c.id_usuario = u.id_usuario
     WHERE u.id_usuario = $1`,
    [idUsuario],
  );
  if (!rows.length) throw new HttpError(404, 'Usuario no encontrado');
  return rows[0];
}
