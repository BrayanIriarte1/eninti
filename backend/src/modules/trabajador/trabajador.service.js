import { pool, query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import { puedeTransitar } from '../../shared/utils/estadosOrden.js';

const SELECT_ORDEN = `
  SELECT m.id_mantencion, m.tipo, m.estado, m.fecha_programada, m.fecha_ejecucion,
         m.actividades, m.observaciones,
         json_build_object(
           'id_planta', p.id_planta, 'direccion', p.direccion, 'comuna', co.nombre,
           'potencia_kw', p.potencia_kw, 'inversor', p.inversor, 'paneles', p.paneles,
           'baterias', p.baterias, 'fecha_instalacion', p.fecha_instalacion,
           'latitud', p.latitud, 'longitud', p.longitud
         ) AS planta,
         json_build_object('nombre', c.nombre, 'telefono', c.telefono) AS cliente,
         sm.motivo AS motivo_solicitud
  FROM mantencion m
  JOIN planta p   ON p.id_planta = m.id_planta
  JOIN comuna co  ON co.id_comuna = p.id_comuna
  JOIN cliente c  ON c.id_cliente = p.id_cliente
  LEFT JOIN solicitud_mantencion sm ON sm.id_solicitud = m.id_solicitud`;

// Agenda del trabajador: solo sus órdenes, ordenadas por fecha (HU-14)
export async function agenda(idTrabajador, { historicas } = {}) {
  const filtroEstado = historicas
    ? `m.estado IN ('finalizada', 'cancelada')`
    : `m.estado IN ('pendiente', 'en_curso')`;
  const { rows } = await query(
    `${SELECT_ORDEN}
     WHERE m.id_trabajador = $1 AND ${filtroEstado}
     ORDER BY m.fecha_programada ${historicas ? 'DESC' : 'ASC'}, m.id_mantencion`,
    [idTrabajador],
  );
  return rows;
}

// Detalle de una orden propia con su historial de estados (HU-16).
// La pertenencia se verifica en el backend, no solo ocultando botones.
export async function obtenerOrden(id, idTrabajador) {
  const { rows } = await query(
    `${SELECT_ORDEN} WHERE m.id_mantencion = $1 AND m.id_trabajador = $2`,
    [id, idTrabajador],
  );
  if (!rows.length) throw new HttpError(404, 'Orden no encontrada o no asignada a ti');

  const { rows: historial } = await query(
    `SELECT h.estado_anterior, h.estado_nuevo, h.comentario, h.fecha_cambio, u.nombre AS responsable
     FROM mantencion_historial h
     JOIN usuario u ON u.id_usuario = h.id_usuario
     WHERE h.id_mantencion = $1
     ORDER BY h.fecha_cambio, h.id_historial`,
    [id],
  );
  return { ...rows[0], historial };
}

// Cambia el estado de una orden propia dejando historial (HU-05, HU-16).
// Finalizar exige actividades y registra fecha de ejecución.
export async function cambiarEstado(id, idTrabajador, { estado, actividades, observaciones, comentario }) {
  if (!['en_curso', 'finalizada'].includes(estado)) {
    throw new HttpError(400, 'estado debe ser en_curso o finalizada');
  }
  const finaliza = estado === 'finalizada';
  const textoActividades = typeof actividades === 'string' ? actividades.trim() : '';
  if (finaliza && !textoActividades) {
    throw new HttpError(400, 'No se puede finalizar sin registrar las actividades realizadas');
  }

  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    const { rows } = await conexion.query(
      'SELECT estado FROM mantencion WHERE id_mantencion = $1 AND id_trabajador = $2 FOR UPDATE',
      [id, idTrabajador],
    );
    if (!rows.length) throw new HttpError(404, 'Orden no encontrada o no asignada a ti');

    const actual = rows[0].estado;
    if (!puedeTransitar(actual, estado)) {
      throw new HttpError(409, `No se puede pasar de ${actual} a ${estado}`);
    }

    await conexion.query(
      `UPDATE mantencion
       SET estado = $2::text,
           fecha_ejecucion = CASE WHEN $2::text = 'finalizada' THEN CURRENT_DATE ELSE fecha_ejecucion END,
           actividades    = COALESCE($3, actividades),
           observaciones  = COALESCE($4, observaciones)
       WHERE id_mantencion = $1`,
      [id, estado, textoActividades || null, observaciones?.trim() || null],
    );
    await conexion.query(
      `INSERT INTO mantencion_historial (id_mantencion, id_usuario, estado_anterior, estado_nuevo, comentario)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, idTrabajador, actual, estado, comentario?.trim() || null],
    );
    await conexion.query('COMMIT');
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }

  return obtenerOrden(id, idTrabajador);
}
