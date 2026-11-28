// CAPA SERVICIO · Calendario y órdenes desde administración (CU-16, CU-17, CU-30, CU-31).
import { pool, query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import { textoOpcional } from '../../shared/utils/texto.js';
import { puedeTransitar } from '../../shared/utils/estadosOrden.js';
import { fotosDeOrden } from '../../shared/utils/fotos.js';
import { avisarAsignacionTrabajador, avisarMantencionProgramada, enSegundoPlano } from '../notificaciones/correo.service.js';
import { avisar, datosOrden } from '../notificaciones/notificaciones.service.js';

const SELECT_MANTENCION = `
  SELECT m.id_mantencion, m.tipo, m.estado, m.fecha_programada, m.fecha_ejecucion,
         m.actividades, m.observaciones, m.id_solicitud,
         m.satisfecho, m.problema_resuelto, m.comentario_cliente, m.fecha_confirmacion,
         (SELECT count(*)::int FROM mantencion_foto f WHERE f.id_mantencion = m.id_mantencion) AS fotos,
         p.id_planta, p.direccion, co.id_comuna, co.nombre AS comuna,
         c.id_cliente, c.nombre AS cliente, c.telefono AS telefono_cliente,
         u.id_usuario AS id_trabajador, u.nombre AS trabajador
  FROM mantencion m
  JOIN planta p   ON p.id_planta = m.id_planta
  JOIN comuna co  ON co.id_comuna = p.id_comuna
  JOIN cliente c  ON c.id_cliente = p.id_cliente
  LEFT JOIN usuario u ON u.id_usuario = m.id_trabajador`;

// [CU-16] Filtro nuevo: agregar('columna = ?', valor).
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

// Una mantención con sus datos de planta, cliente y técnico.
async function obtener(id) {
  const { rows } = await query(`${SELECT_MANTENCION} WHERE m.id_mantencion = $1`, [id]);
  if (!rows.length) throw new HttpError(404, 'Mantención no encontrada');
  return rows[0];
}

// [CU-16] Solo se asigna a un trabajador activo (la BD también lo exige con un trigger).
async function validarTrabajadorActivo(conexion, idTrabajador) {
  const { rows } = await conexion.query(
    `SELECT 1 FROM usuario WHERE id_usuario = $1 AND rol = 'trabajador' AND activo`,
    [idTrabajador],
  );
  if (!rows.length) throw new HttpError(400, 'Solo se puede asignar a un trabajador activo');
}

// [CU-16, CU-17]
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

    // Las preventivas son parte de la suscripción: sin suscripción vigente solo hay correctivas
    if (tipo === 'preventiva') {
      const { rows: vigente } = await conexion.query(
        `SELECT 1 FROM suscripcion WHERE id_planta = $1 AND estado <> 'cancelada'`,
        [id_planta],
      );
      if (!vigente.length) {
        throw new HttpError(409, 'La planta no tiene una suscripción vigente: solo se puede programar una mantención correctiva');
      }
    }

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
    // Avisos por correo después de confirmar la transacción (HU-11, HU-17)
    enSegundoPlano(avisarMantencionProgramada(creada[0].id_mantencion));
    if (id_trabajador) enSegundoPlano(avisarAsignacionTrabajador(creada[0].id_mantencion));
    await notificarOrden(creada[0].id_mantencion, { cliente: 'programada', trabajador: id_trabajador ? 'asignada' : null });
    return obtener(creada[0].id_mantencion);
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }
}

// [CU-16]
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
    enSegundoPlano(avisarAsignacionTrabajador(id)); // HU-17
    await notificarOrden(id, { trabajador: 'asignada' });
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }
  return obtener(id);
}

// [CU-30]
// Cancela una orden abierta dejando historial (HU-16). Si la orden nació de una solicitud
// del cliente, la solicitud vuelve a 'pendiente' en la bandeja para reprogramarla o rechazarla.
export async function cancelar(id, idAdmin, comentario) {
  const textoComentario = textoOpcional(comentario, 'comentario', 255);
  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    const { rows } = await conexion.query(
      'SELECT estado, id_solicitud FROM mantencion WHERE id_mantencion = $1 FOR UPDATE',
      [id],
    );
    if (!rows.length) throw new HttpError(404, 'Mantención no encontrada');
    if (!puedeTransitar(rows[0].estado, 'cancelada')) {
      throw new HttpError(409, `No se puede cancelar una mantención ${rows[0].estado}`);
    }
    await conexion.query(`UPDATE mantencion SET estado = 'cancelada' WHERE id_mantencion = $1`, [id]);
    if (rows[0].id_solicitud) {
      await conexion.query(
        `UPDATE solicitud_mantencion SET estado = 'pendiente', fecha_asignada = NULL
         WHERE id_solicitud = $1 AND estado = 'asignada'`,
        [rows[0].id_solicitud],
      );
    }
    await conexion.query(
      `INSERT INTO mantencion_historial (id_mantencion, id_usuario, estado_anterior, estado_nuevo, comentario)
       VALUES ($1, $2, $3, 'cancelada', $4)`,
      [id, idAdmin, rows[0].estado, textoComentario],
    );
    await conexion.query('COMMIT');
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }
  await notificarOrden(id, { cliente: 'cancelada', trabajador: 'cancelada', motivo: textoComentario });
  return obtener(id);
}

// [CU-17]
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

// [CU-17]
export async function rechazarSolicitud(id) {
  const { rows } = await query(
    `UPDATE solicitud_mantencion SET estado = 'rechazada'
     WHERE id_solicitud = $1 AND estado = 'pendiente'
     RETURNING *`,
    [id],
  );
  if (!rows.length) throw new HttpError(409, 'La solicitud no existe o ya fue atendida');
  const { rows: [planta] } = await query(
    'SELECT p.direccion, c.id_usuario FROM planta p JOIN cliente c USING (id_cliente) WHERE p.id_planta = $1',
    [rows[0].id_planta],
  );
  await avisar(planta?.id_usuario, {
    tipo: 'solicitud_rechazada', titulo: 'Tu solicitud de mantención no fue aceptada',
    detalle: `${planta?.direccion}. Contáctanos si necesitas más información`, ruta: '/cliente/solicitudes',
  });
  return rows[0];
}

// [CU-31]
// Fotos del trabajo realizado que el técnico envió al cliente
export async function fotos(id) {
  await obtener(id);
  return fotosDeOrden({ query }, id);
}

// [CU-31]
// Cierre por el administrador cuando el cliente no puede confirmar (por ejemplo, no tiene
// cuenta web o confirmó por teléfono). Queda en el historial quién cerró y por qué.
export async function cerrarSinCliente(id, idAdmin, comentario) {
  const motivo = typeof comentario === 'string' ? comentario.trim() : '';
  if (!motivo) throw new HttpError(400, 'Indica por qué se cierra la orden sin la confirmación del cliente');
  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    const { rows } = await conexion.query(
      'SELECT estado, id_solicitud FROM mantencion WHERE id_mantencion = $1 FOR UPDATE',
      [id],
    );
    if (!rows.length) throw new HttpError(404, 'Mantención no encontrada');
    if (rows[0].estado !== 'por_confirmar') {
      throw new HttpError(409, 'Solo se cierra así una orden que espera la confirmación del cliente');
    }
    await conexion.query(
      `UPDATE mantencion SET estado = 'finalizada', fecha_confirmacion = now() WHERE id_mantencion = $1`,
      [id],
    );
    if (rows[0].id_solicitud) {
      await conexion.query(`UPDATE solicitud_mantencion SET estado = 'cerrada' WHERE id_solicitud = $1`, [rows[0].id_solicitud]);
    }
    await conexion.query(
      `INSERT INTO mantencion_historial (id_mantencion, id_usuario, estado_anterior, estado_nuevo, comentario)
       VALUES ($1, $2, 'por_confirmar', 'finalizada', $3)`,
      [id, idAdmin, `Cerrada por administración: ${motivo}`.slice(0, 255)],
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

// [CU-37] Avisos de la campana sobre una orden: al cliente (programada o cancelada) y al técnico
// (asignada o cancelada). Se llaman después de confirmar la transacción.
async function notificarOrden(idMantencion, { cliente, trabajador, motivo }) {
  const o = await datosOrden(idMantencion);
  if (!o) return;
  const fecha = o.fecha_programada?.split('-').reverse().join('-');
  const conMotivo = motivo ? `: ${motivo}` : '';
  if (cliente === 'programada') {
    await avisar(o.id_usuario_cliente, {
      tipo: 'mantencion_programada', titulo: `Programamos una mantención ${o.tipo} para tu planta`,
      detalle: `${o.direccion}, el ${fecha}`, ruta: '/cliente/mantenciones',
    });
  }
  if (cliente === 'cancelada') {
    await avisar(o.id_usuario_cliente, {
      tipo: 'mantencion_cancelada', titulo: 'Se canceló una visita a tu planta',
      detalle: `${o.direccion} (${fecha})${conMotivo}`, ruta: '/cliente/mantenciones',
    });
  }
  if (trabajador && o.id_trabajador) {
    await avisar(o.id_trabajador, trabajador === 'asignada'
      ? { tipo: 'orden_asignada', titulo: 'Te asignaron una visita', detalle: `${o.direccion}, ${o.comuna} · ${fecha}`, ruta: `/trabajador/ordenes/${idMantencion}` }
      : { tipo: 'orden_cancelada', titulo: 'Se canceló una de tus visitas', detalle: `${o.direccion} (${fecha})${conMotivo}`, ruta: '/trabajador/agenda' });
  }
}
