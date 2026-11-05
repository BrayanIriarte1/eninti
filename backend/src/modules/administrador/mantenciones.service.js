import { pool, query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import { puedeTransitar } from '../../shared/utils/estadosOrden.js';

const SELECT_MANTENCION = `
  SELECT m.id_mantencion, m.tipo, m.estado, m.fecha_programada, m.fecha_ejecucion,
         m.actividades, m.observaciones, m.id_solicitud,
         p.id_planta, p.direccion, co.id_comuna, co.nombre AS comuna,
         c.id_cliente, c.nombre AS cliente, c.telefono AS telefono_cliente,
         u.id_usuario AS id_trabajador, u.nombre AS trabajador
  FROM mantencion m
  JOIN planta p   ON p.id_planta = m.id_planta
  JOIN comuna co  ON co.id_comuna = p.id_comuna
  JOIN cliente c  ON c.id_cliente = p.id_cliente
  LEFT JOIN usuario u ON u.id_usuario = m.id_trabajador`;

// Calendario de mantenciones filtrable por comuna y rango de fechas (HU-04)
export async function listar({ id_comuna, desde, hasta, estado }) {
  const condiciones = [];
  const params = [];
  const agregar = (sql, valor) => {
    params.push(valor);
    condiciones.push(sql.replace('?', `$${params.length}`));
  };
  if (id_comuna) agregar('co.id_comuna = ?', id_comuna);
  if (desde) agregar('m.fecha_programada >= ?', desde);
  if (hasta) agregar('m.fecha_programada <= ?', hasta);
  if (estado) agregar('m.estado = ?', estado);

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const { rows } = await query(
    `${SELECT_MANTENCION} ${where} ORDER BY co.nombre, m.fecha_programada, m.id_mantencion`,
    params,
  );
  return rows;
}

async function obtener(id) {
  const { rows } = await query(`${SELECT_MANTENCION} WHERE m.id_mantencion = $1`, [id]);
  if (!rows.length) throw new HttpError(404, 'Mantención no encontrada');
  return rows[0];
}

async function validarTrabajadorActivo(conexion, idTrabajador) {
  const { rows } = await conexion.query(
    `SELECT 1 FROM usuario WHERE id_usuario = $1 AND rol = 'trabajador' AND activo`,
    [idTrabajador],
  );
  if (!rows.length) throw new HttpError(400, 'Solo se puede asignar a un trabajador activo');
}

// Programa una mantención, opcionalmente desde una solicitud del cliente (HU-11, HU-17)
export async function crear({ id_planta, tipo, fecha_programada, id_trabajador, id_solicitud }, idAdmin) {
  const errores = [];
  if (!Number.isInteger(id_planta) || id_planta <= 0) errores.push('id_planta es obligatorio');
  if (!['preventiva', 'correctiva'].includes(tipo)) errores.push('tipo debe ser preventiva o correctiva');
  if (typeof fecha_programada !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha_programada)) {
    errores.push('fecha_programada debe tener formato YYYY-MM-DD');
  }
  if (errores.length) throw new HttpError(400, 'Datos de la mantención inválidos', errores);

  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    if (id_trabajador) await validarTrabajadorActivo(conexion, id_trabajador);

    if (id_solicitud) {
      const { rows } = await conexion.query(
        `UPDATE solicitud_mantencion
         SET estado = 'asignada', fecha_asignada = $2
         WHERE id_solicitud = $1 AND estado = 'pendiente'
         RETURNING id_planta`,
        [id_solicitud, fecha_programada],
      );
      if (!rows.length) throw new HttpError(409, 'La solicitud no existe o ya fue atendida');
      if (rows[0].id_planta !== id_planta) {
        throw new HttpError(400, 'La solicitud corresponde a otra planta');
      }
    }

    const { rows: creada } = await conexion.query(
      `INSERT INTO mantencion (id_planta, id_solicitud, id_trabajador, tipo, fecha_programada)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_mantencion`,
      [id_planta, id_solicitud ?? null, id_trabajador ?? null, tipo, fecha_programada],
    );
    await conexion.query(
      `INSERT INTO mantencion_historial (id_mantencion, id_usuario, estado_anterior, estado_nuevo, comentario)
       VALUES ($1, $2, NULL, 'pendiente', 'Mantención programada')`,
      [creada[0].id_mantencion, idAdmin],
    );
    await conexion.query('COMMIT');
    return obtener(creada[0].id_mantencion);
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }
}

// Asigna o reasigna la visita a un trabajador activo (HU-17)
export async function asignar(id, { id_trabajador }) {
  if (!Number.isInteger(id_trabajador) || id_trabajador <= 0) {
    throw new HttpError(400, 'id_trabajador es obligatorio');
  }
  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    await validarTrabajadorActivo(conexion, id_trabajador);
    const { rows } = await conexion.query(
      `UPDATE mantencion SET id_trabajador = $2
       WHERE id_mantencion = $1 AND estado IN ('pendiente', 'en_curso')
       RETURNING id_mantencion`,
      [id, id_trabajador],
    );
    if (!rows.length) throw new HttpError(409, 'La mantención no existe o ya está cerrada');
    await conexion.query('COMMIT');
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }
  return obtener(id);
}

// Cancela una orden abierta dejando historial (HU-16)
export async function cancelar(id, idAdmin, comentario) {
  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    const { rows } = await conexion.query(
      'SELECT estado FROM mantencion WHERE id_mantencion = $1 FOR UPDATE',
      [id],
    );
    if (!rows.length) throw new HttpError(404, 'Mantención no encontrada');
    if (!puedeTransitar(rows[0].estado, 'cancelada')) {
      throw new HttpError(409, `No se puede cancelar una mantención ${rows[0].estado}`);
    }
    await conexion.query(`UPDATE mantencion SET estado = 'cancelada' WHERE id_mantencion = $1`, [id]);
    await conexion.query(
      `INSERT INTO mantencion_historial (id_mantencion, id_usuario, estado_anterior, estado_nuevo, comentario)
       VALUES ($1, $2, $3, 'cancelada', $4)`,
      [id, idAdmin, rows[0].estado, comentario?.trim() || null],
    );
    await conexion.query('COMMIT');
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }
  return obtener(id);
}

// Bandeja de solicitudes de los clientes (HU-11)
export async function listarSolicitudes({ estado }) {
  const params = [];
  let where = '';
  if (estado) {
    params.push(estado);
    where = 'WHERE sm.estado = $1';
  }
  const { rows } = await query(
    `SELECT sm.*, p.direccion, co.nombre AS comuna, c.nombre AS cliente, c.telefono AS telefono_cliente,
            p.id_planta
     FROM solicitud_mantencion sm
     JOIN planta p  ON p.id_planta = sm.id_planta
     JOIN comuna co ON co.id_comuna = p.id_comuna
     JOIN cliente c ON c.id_cliente = p.id_cliente
     ${where}
     ORDER BY (sm.estado <> 'pendiente'), sm.fecha_solicitud`,
    params,
  );
  return rows;
}

export async function rechazarSolicitud(id) {
  const { rows } = await query(
    `UPDATE solicitud_mantencion SET estado = 'rechazada'
     WHERE id_solicitud = $1 AND estado = 'pendiente'
     RETURNING *`,
    [id],
  );
  if (!rows.length) throw new HttpError(409, 'La solicitud no existe o ya fue atendida');
  return rows[0];
}
