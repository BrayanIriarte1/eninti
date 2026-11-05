import jwt from 'jsonwebtoken';
import { pool, query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import { hashPassword, verificarPassword } from '../../shared/utils/password.js';

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

// Registro del cliente (HU-07): su RUT debe estar previamente registrado por ENINTI
// y la ficha no debe tener ya una cuenta web asociada.
export async function registrarCliente({ rut, email, password, telefono }) {
  const errores = [];
  if (typeof rut !== 'string' || !/^\d{7,8}-[\dkK]$/.test(rut?.trim())) {
    errores.push('rut debe tener formato 12345678-9');
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email?.trim())) {
    errores.push('email no es válido');
  }
  if (typeof password !== 'string' || password.length < 8) {
    errores.push('password debe tener al menos 8 caracteres');
  }
  if (errores.length) throw new HttpError(400, 'Datos de registro inválidos', errores);

  const { rows } = await query('SELECT * FROM cliente WHERE rut = $1', [rut.trim()]);
  const cliente = rows[0];
  if (!cliente) throw new HttpError(404, 'El RUT no está registrado por ENINTI. Contáctanos para incorporarte');
  if (cliente.id_usuario) throw new HttpError(409, 'Este cliente ya tiene una cuenta creada');

  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    const { rows: creado } = await conexion.query(
      `INSERT INTO usuario (nombre, email, password_hash, rol, telefono)
       VALUES ($1, $2, $3, 'cliente', $4)
       RETURNING *`,
      [cliente.nombre, email.trim().toLowerCase(), await hashPassword(password), telefono ?? cliente.telefono],
    );
    await conexion.query('UPDATE cliente SET id_usuario = $1 WHERE id_cliente = $2', [
      creado[0].id_usuario,
      cliente.id_cliente,
    ]);
    await conexion.query('COMMIT');
    return {
      token: firmarToken(creado[0]),
      usuario: { id: creado[0].id_usuario, nombre: creado[0].nombre, rol: 'cliente', email: creado[0].email },
    };
  } catch (err) {
    await conexion.query('ROLLBACK');
    if (err.code === '23505') throw new HttpError(409, 'El correo ya está en uso');
    throw err;
  } finally {
    conexion.release();
  }
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
