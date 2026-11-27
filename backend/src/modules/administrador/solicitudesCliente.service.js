// CAPA SERVICIO · Solicitudes del cliente que resuelve el administrador:
// suscripción nueva (CU-28) y cambio de correo/teléfono (CU-29).
import { pool, query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';

const ESTADOS = ['pendiente', 'aprobada', 'rechazada'];
const texto = (v) => (typeof v === 'string' ? v.trim() : '');

function validarEstado(estado) {
  if (estado && !ESTADOS.includes(estado)) {
    throw new HttpError(400, `estado debe ser uno de: ${ESTADOS.join(', ')}`);
  }
}

// Ejecuta fn dentro de una transacción y libera la conexión pase lo que pase
async function enTransaccion(fn) {
  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    const resultado = await fn(conexion);
    await conexion.query('COMMIT');
    return resultado;
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }
}

// ============================================================ Solicitudes de suscripción
// Solo el administrador otorga suscripciones. Ve la deuda pendiente del cliente y la
// suscripción anterior para decidir o llegar a un acuerdo antes de aceptar.

// [CU-28] Incluye la deuda del cliente y su suscripción anterior para decidir.
export async function listarSuscripciones(estado) {
  validarEstado(estado);
  const { rows } = await query(
    `SELECT ss.*, p.direccion, co.nombre AS comuna, c.id_cliente, c.nombre AS cliente, c.rut, c.telefono,
            u.nombre AS resuelta_por_nombre,
            (SELECT COALESCE(sum(cu.monto), 0)::int FROM cuota cu
             JOIN suscripcion s2 ON s2.id_suscripcion = cu.id_suscripcion
             JOIN planta p2 ON p2.id_planta = s2.id_planta
             WHERE p2.id_cliente = c.id_cliente AND cu.estado = 'vencida') AS deuda_cliente,
            (SELECT json_build_object('monto_mensual', s.monto_mensual, 'dia_cobro', s.dia_cobro,
                                      'fecha_cancelacion', s.fecha_cancelacion, 'motivo_cancelacion', s.motivo_cancelacion)
             FROM suscripcion s WHERE s.id_planta = p.id_planta
             ORDER BY s.fecha_inicio DESC, s.id_suscripcion DESC LIMIT 1) AS anterior
     FROM solicitud_suscripcion ss
     JOIN planta p  ON p.id_planta = ss.id_planta
     JOIN comuna co ON co.id_comuna = p.id_comuna
     JOIN cliente c ON c.id_cliente = p.id_cliente
     LEFT JOIN usuario u ON u.id_usuario = ss.resuelta_por
     WHERE ($1::text IS NULL OR ss.estado = $1)
     ORDER BY (ss.estado <> 'pendiente'), ss.fecha_solicitud DESC`,
    [estado || null],
  );
  return rows;
}

// [CU-28] Crea la suscripción con la cuota, día de cobro y fecha que fija el administrador.
export async function aprobarSuscripcion(id, idAdmin, { monto_mensual, dia_cobro, fecha_inicio, respuesta }) {
  const errores = [];
  if (!Number.isInteger(monto_mensual) || monto_mensual <= 0) errores.push('monto_mensual debe ser un entero mayor a 0');
  if (dia_cobro !== undefined && !(Number.isInteger(dia_cobro) && dia_cobro >= 1 && dia_cobro <= 28)) {
    errores.push('dia_cobro debe estar entre 1 y 28');
  }
  if (fecha_inicio !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(fecha_inicio)) {
    errores.push('fecha_inicio debe tener formato YYYY-MM-DD');
  }
  if (texto(respuesta).length > 500) errores.push('La respuesta admite hasta 500 caracteres');
  if (errores.length) throw new HttpError(400, 'Datos de la suscripción inválidos', errores);

  return enTransaccion(async (conexion) => {
    const { rows } = await conexion.query(
      'SELECT * FROM solicitud_suscripcion WHERE id_solicitud_suscripcion = $1 FOR UPDATE',
      [id],
    );
    if (!rows.length) throw new HttpError(404, 'Solicitud no encontrada');
    if (rows[0].estado !== 'pendiente') throw new HttpError(409, `La solicitud ya está ${rows[0].estado}`);

    let suscripcion;
    try {
      ({ rows: [suscripcion] } = await conexion.query(
        `INSERT INTO suscripcion (id_planta, monto_mensual, fecha_inicio, dia_cobro)
         VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), COALESCE($4::smallint, 1))
         RETURNING *`,
        [rows[0].id_planta, monto_mensual, fecha_inicio ?? null, dia_cobro ?? null],
      ));
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, 'La planta ya tiene una suscripción vigente');
      throw err;
    }
    const { rows: [solicitud] } = await conexion.query(
      `UPDATE solicitud_suscripcion
       SET estado = 'aprobada', fecha_resolucion = now(), resuelta_por = $2, respuesta = $3, id_suscripcion = $4
       WHERE id_solicitud_suscripcion = $1 RETURNING *`,
      [id, idAdmin, texto(respuesta) || null, suscripcion.id_suscripcion],
    );
    return { solicitud, suscripcion };
  });
}

// [CU-28] La respuesta queda visible para el cliente.
export async function rechazarSuscripcion(id, idAdmin, { respuesta }) {
  const motivo = texto(respuesta);
  if (!motivo) throw new HttpError(400, 'Indica al cliente el motivo o el acuerdo pendiente');
  if (motivo.length > 500) throw new HttpError(400, 'La respuesta admite hasta 500 caracteres');
  const { rows } = await query(
    `UPDATE solicitud_suscripcion
     SET estado = 'rechazada', fecha_resolucion = now(), resuelta_por = $2, respuesta = $3
     WHERE id_solicitud_suscripcion = $1 AND estado = 'pendiente' RETURNING *`,
    [id, idAdmin, motivo],
  );
  if (!rows.length) throw new HttpError(409, 'La solicitud no existe o ya fue resuelta');
  return rows[0];
}

// ============================================================ Cambios de datos del cliente

// [CU-29]
export async function listarCambiosDatos(estado) {
  validarEstado(estado);
  const { rows } = await query(
    `SELECT sc.*, c.nombre AS cliente, c.rut, c.telefono AS telefono_actual, us.email AS email_actual,
            u.nombre AS resuelta_por_nombre
     FROM solicitud_cambio_datos sc
     JOIN cliente c ON c.id_cliente = sc.id_cliente
     LEFT JOIN usuario us ON us.id_usuario = c.id_usuario
     LEFT JOIN usuario u ON u.id_usuario = sc.resuelta_por
     WHERE ($1::text IS NULL OR sc.estado = $1)
     ORDER BY (sc.estado <> 'pendiente'), sc.fecha_solicitud DESC`,
    [estado || null],
  );
  return rows;
}

// [CU-29]
// Aplica el nuevo correo (cuenta web) y el nuevo teléfono (ficha y cuenta) en una transacción
export async function aprobarCambioDatos(id, idAdmin, { respuesta }) {
  return enTransaccion(async (conexion) => {
    const { rows } = await conexion.query(
      `SELECT sc.*, c.id_usuario FROM solicitud_cambio_datos sc
       JOIN cliente c ON c.id_cliente = sc.id_cliente
       WHERE sc.id_solicitud_cambio = $1 FOR UPDATE OF sc`,
      [id],
    );
    if (!rows.length) throw new HttpError(404, 'Solicitud no encontrada');
    const solicitud = rows[0];
    if (solicitud.estado !== 'pendiente') throw new HttpError(409, `La solicitud ya está ${solicitud.estado}`);

    if (solicitud.email_nuevo) {
      try {
        await conexion.query('UPDATE usuario SET email = $2 WHERE id_usuario = $1', [solicitud.id_usuario, solicitud.email_nuevo]);
      } catch (err) {
        if (err.code === '23505') throw new HttpError(409, 'El nuevo correo ya está en uso por otra cuenta');
        throw err;
      }
    }
    if (solicitud.telefono_nuevo) {
      await conexion.query('UPDATE cliente SET telefono = $2 WHERE id_cliente = $1', [solicitud.id_cliente, solicitud.telefono_nuevo]);
      await conexion.query('UPDATE usuario SET telefono = $2 WHERE id_usuario = $1', [solicitud.id_usuario, solicitud.telefono_nuevo]);
    }
    const { rows: [resuelta] } = await conexion.query(
      `UPDATE solicitud_cambio_datos
       SET estado = 'aprobada', fecha_resolucion = now(), resuelta_por = $2, respuesta = $3
       WHERE id_solicitud_cambio = $1 RETURNING *`,
      [id, idAdmin, texto(respuesta) || null],
    );
    return resuelta;
  });
}

// [CU-29] La respuesta (motivo) es obligatoria y la ve el cliente.
export async function rechazarCambioDatos(id, idAdmin, { respuesta }) {
  const motivo = texto(respuesta);
  if (!motivo) throw new HttpError(400, 'Indica al cliente el motivo del rechazo');
  const { rows } = await query(
    `UPDATE solicitud_cambio_datos
     SET estado = 'rechazada', fecha_resolucion = now(), resuelta_por = $2, respuesta = $3
     WHERE id_solicitud_cambio = $1 AND estado = 'pendiente' RETURNING *`,
    [id, idAdmin, motivo.slice(0, 300)],
  );
  if (!rows.length) throw new HttpError(409, 'La solicitud no existe o ya fue resuelta');
  return rows[0];
}
