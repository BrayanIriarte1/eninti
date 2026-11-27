import { pool, query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import { hashPassword } from '../../shared/utils/password.js';
import { telefonoValido } from '../../shared/utils/rut.js';

const SELECT_TRABAJADOR = `
  SELECT id_usuario, nombre, email, telefono, activo, fecha_creacion, ultimo_acceso
  FROM usuario WHERE rol = 'trabajador'`;

export async function listar() {
  const { rows } = await query(`${SELECT_TRABAJADOR} ORDER BY activo DESC, nombre`);
  return rows;
}

function validar({ nombre, email, password, telefono }, { parcial }) {
  const errores = [];
  if (!parcial || nombre !== undefined) {
    if (typeof nombre !== 'string' || !nombre.trim()) errores.push('nombre es obligatorio');
  }
  if (!parcial || email !== undefined) {
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.push('email no es válido');
  }
  if ((!parcial && (typeof password !== 'string' || password.length < 8)) ||
      (parcial && password !== undefined && (typeof password !== 'string' || password.length < 8))) {
    errores.push('password debe tener al menos 8 caracteres');
  }
  if (telefono !== undefined && telefono !== null && telefono !== '' && !telefonoValido(telefono)) {
    errores.push('telefono debe incluir el código de país, por ejemplo +56912345678');
  }
  if (errores.length) throw new HttpError(400, 'Datos del trabajador inválidos', errores);
}

// Alta de un trabajador con contraseña inicial (HU-15)
export async function crear(datos) {
  validar(datos, { parcial: false });
  const { rows } = await query(
    `INSERT INTO usuario (nombre, email, password_hash, rol, telefono)
     VALUES ($1, $2, $3, 'trabajador', $4)
     RETURNING id_usuario, nombre, email, telefono, activo, fecha_creacion`,
    [datos.nombre.trim(), datos.email.trim().toLowerCase(), await hashPassword(datos.password), datos.telefono ?? null],
  );
  return rows[0];
}

// Edita datos, restablece contraseña o activa/desactiva (HU-15).
// Un trabajador desactivado no puede iniciar sesión y sus tokens vigentes quedan rechazados.
// Sus órdenes abiertas (pendiente o en curso) quedan sin técnico para reasignarlas, con
// constancia en el historial. Las que esperan al cliente (por_confirmar) no cambian.
export async function actualizar(id, datos, idAdmin) {
  validar(datos, { parcial: true });
  const { nombre, email, password, telefono, activo } = datos;
  if (activo !== undefined && typeof activo !== 'boolean') {
    throw new HttpError(400, 'activo debe ser true o false');
  }

  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    const trabajador = await actualizarUsuario(conexion, id, { nombre, email, password, telefono, activo });
    const ordenesLiberadas = activo === false ? await liberarOrdenes(conexion, trabajador, idAdmin) : 0;
    await conexion.query('COMMIT');
    return { ...trabajador, ordenes_liberadas: ordenesLiberadas };
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }
}

async function liberarOrdenes(conexion, trabajador, idAdmin) {
  const { rows } = await conexion.query(
    `UPDATE mantencion SET id_trabajador = NULL
     WHERE id_trabajador = $1 AND estado IN ('pendiente', 'en_curso')
     RETURNING id_mantencion, estado`,
    [trabajador.id_usuario],
  );
  for (const orden of rows) {
    await conexion.query(
      `INSERT INTO mantencion_historial (id_mantencion, id_usuario, estado_anterior, estado_nuevo, comentario)
       VALUES ($1, $2, $3, $3, $4)`,
      [orden.id_mantencion, idAdmin, orden.estado,
        `Técnico ${trabajador.nombre} desactivado: la orden queda sin técnico asignado`.slice(0, 255)],
    );
  }
  return rows.length;
}

async function actualizarUsuario(conexion, id, { nombre, email, password, telefono, activo }) {
  const { rows } = await conexion.query(
    `UPDATE usuario
     SET nombre        = COALESCE($2, nombre),
         email         = COALESCE($3, email),
         password_hash = COALESCE($4, password_hash),
         telefono      = COALESCE($5, telefono),
         activo        = COALESCE($6, activo)
     WHERE id_usuario = $1 AND rol = 'trabajador'
     RETURNING id_usuario, nombre, email, telefono, activo, fecha_creacion, ultimo_acceso`,
    [
      id,
      nombre?.trim() ?? null,
      email?.trim().toLowerCase() ?? null,
      password ? await hashPassword(password) : null,
      telefono ?? null,
      activo ?? null,
    ],
  );
  if (!rows.length) throw new HttpError(404, 'Trabajador no encontrado');
  return rows[0];
}
