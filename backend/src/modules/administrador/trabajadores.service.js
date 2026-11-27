// CAPA SERVICIO · Cuentas de trabajadores (CU-15).
import { query } from '../../config/db.js';
import { enTransaccion } from '../../shared/utils/transaccion.js';
import { HttpError } from '../../shared/utils/httpError.js';
import { erroresContrasena, hashPassword } from '../../shared/utils/password.js';
import { telefonoValido } from '../../shared/utils/rut.js';

const SELECT_TRABAJADOR = `
  SELECT id_usuario, nombre, email, telefono, activo, fecha_creacion, ultimo_acceso
  FROM usuario WHERE rol = 'trabajador'`;

// [CU-15]
export async function listar() {
  const { rows } = await query(`${SELECT_TRABAJADOR} ORDER BY activo DESC, nombre`);
  return rows;
}

// [CU-15] Reglas del formulario de trabajador.
function validar({ nombre, email, password, telefono }, { parcial }) {
  const errores = [];
  if (!parcial || nombre !== undefined) {
    if (typeof nombre !== 'string' || !nombre.trim()) errores.push('nombre es obligatorio');
  }
  if (!parcial || email !== undefined) {
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.push('email no es válido');
  }
  if (!parcial || password !== undefined) {
    errores.push(...erroresContrasena(password));
  }
  if (telefono !== undefined && telefono !== null && telefono !== '' && !telefonoValido(telefono)) {
    errores.push('telefono debe incluir el código de país, por ejemplo +56912345678');
  }
  if (errores.length) throw new HttpError(400, 'Datos del trabajador inválidos', errores);
}

// [CU-15]
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

// [CU-15]
// Edita datos, restablece contraseña o activa/desactiva (HU-15).
// Un trabajador desactivado no puede iniciar sesión y sus tokens vigentes quedan rechazados.
export async function actualizar(id, datos, idAdmin) {
  validar(datos, { parcial: true });
  const { nombre, email, password, telefono, activo } = datos;
  if (activo !== undefined && typeof activo !== 'boolean') {
    throw new HttpError(400, 'activo debe ser true o false');
  }
  const hash = password ? await hashPassword(password) : null;

  return enTransaccion(async (conexion) => {
    const { rows } = await conexion.query(
      `UPDATE usuario
       SET nombre        = COALESCE($2, nombre),
           email         = COALESCE($3, email),
           password_hash = COALESCE($4, password_hash),
           -- Restablecer la contraseña cierra las sesiones abiertas del trabajador
           password_actualizado = CASE WHEN $4::text IS NULL THEN password_actualizado ELSE now() END,
           telefono      = COALESCE($5, telefono),
           activo        = COALESCE($6, activo)
       WHERE id_usuario = $1 AND rol = 'trabajador'
       RETURNING id_usuario, nombre, email, telefono, activo, fecha_creacion, ultimo_acceso`,
      [id, nombre?.trim() ?? null, email?.trim().toLowerCase() ?? null, hash, telefono ?? null, activo ?? null],
    );
    if (!rows.length) throw new HttpError(404, 'Trabajador no encontrado');

    // Al desactivar, sus órdenes abiertas quedan "Sin asignar" en el calendario para
    // reasignarlas (HU-17); el historial deja constancia del motivo.
    let ordenesLiberadas = 0;
    if (activo === false) {
      const { rows: liberadas } = await conexion.query(
        `UPDATE mantencion SET id_trabajador = NULL
         WHERE id_trabajador = $1 AND estado IN ('pendiente', 'en_curso')
         RETURNING id_mantencion, estado`,
        [id],
      );
      for (const orden of liberadas) {
        await conexion.query(
          `INSERT INTO mantencion_historial (id_mantencion, id_usuario, estado_anterior, estado_nuevo, comentario)
           VALUES ($1, $2, $3, $3, 'Trabajador desactivado: la orden queda sin asignar')`,
          [orden.id_mantencion, idAdmin, orden.estado],
        );
      }
      ordenesLiberadas = liberadas.length;
    }
    return { ...rows[0], ordenes_liberadas: ordenesLiberadas };
  });
}
