import { pool, query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import * as pasarela from '../pagos/pasarela.service.js';

// Resuelve la ficha de cliente del usuario autenticado. Toda consulta del módulo
// parte de aquí: un cliente solo ve sus propios datos (frontera de confianza).
async function fichaCliente(idUsuario) {
  const { rows } = await query('SELECT * FROM cliente WHERE id_usuario = $1', [idUsuario]);
  if (!rows.length) throw new HttpError(404, 'Tu usuario no tiene ficha de cliente asociada');
  return rows[0];
}

// Mis plantas con su suscripción vigente (HU-10)
export async function misPlantas(idUsuario) {
  const cliente = await fichaCliente(idUsuario);
  const { rows } = await query(
    `SELECT p.*, co.nombre AS comuna,
            CASE WHEN s.id_suscripcion IS NULL THEN NULL ELSE json_build_object(
              'id_suscripcion', s.id_suscripcion, 'estado', s.estado,
              'monto_mensual', s.monto_mensual, 'fecha_inicio', s.fecha_inicio,
              'dia_cobro', s.dia_cobro, 'mantenciones_anuales', s.mantenciones_anuales
            ) END AS suscripcion
     FROM planta p
     JOIN comuna co ON co.id_comuna = p.id_comuna
     LEFT JOIN suscripcion s ON s.id_planta = p.id_planta AND s.estado <> 'cancelada'
     WHERE p.id_cliente = $1
     ORDER BY p.direccion`,
    [cliente.id_cliente],
  );
  return rows;
}

// Ficha técnica de una planta propia; un id ajeno responde 404 (HU-10)
export async function obtenerPlanta(idUsuario, idPlanta) {
  const plantas = await misPlantas(idUsuario);
  const planta = plantas.find((p) => p.id_planta === idPlanta);
  if (!planta) throw new HttpError(404, 'Planta no encontrada');
  return planta;
}

// Mi Cuenta: meses pagados, deuda vigente e historial de pagos (HU-08)
export async function cuenta(idUsuario) {
  const cliente = await fichaCliente(idUsuario);

  const { rows: resumen } = await query(
    `SELECT s.id_suscripcion, s.estado, s.monto_mensual, s.fecha_inicio, p.direccion, co.nombre AS comuna,
            count(c.id_cuota) FILTER (WHERE c.estado = 'pagada')  ::int AS meses_pagados,
            count(c.id_cuota) FILTER (WHERE c.estado = 'vencida') ::int AS cuotas_vencidas,
            COALESCE(sum(c.monto) FILTER (WHERE c.estado = 'vencida'), 0)::int AS deuda
     FROM suscripcion s
     JOIN planta p  ON p.id_planta = s.id_planta
     JOIN comuna co ON co.id_comuna = p.id_comuna
     LEFT JOIN cuota c ON c.id_suscripcion = s.id_suscripcion
     WHERE p.id_cliente = $1
     GROUP BY s.id_suscripcion, p.direccion, co.nombre
     ORDER BY (s.estado = 'cancelada'), p.direccion`,
    [cliente.id_cliente],
  );

  const { rows: pagos } = await query(
    `SELECT pa.fecha_pago, pa.monto, pa.origen, pa.referencia, c.periodo, p.direccion
     FROM pago pa
     JOIN cuota c  ON c.id_cuota = pa.id_cuota
     JOIN suscripcion s ON s.id_suscripcion = c.id_suscripcion
     JOIN planta p ON p.id_planta = s.id_planta
     WHERE p.id_cliente = $1
     ORDER BY pa.fecha_pago DESC
     LIMIT 50`,
    [cliente.id_cliente],
  );

  const { rows: cuotasPendientes } = await query(
    `SELECT c.periodo, c.monto, c.fecha_vencimiento, c.estado, p.direccion
     FROM cuota c
     JOIN suscripcion s ON s.id_suscripcion = c.id_suscripcion
     JOIN planta p ON p.id_planta = s.id_planta
     WHERE p.id_cliente = $1 AND c.estado IN ('pendiente', 'vencida')
     ORDER BY c.fecha_vencimiento`,
    [cliente.id_cliente],
  );

  const { rows: mediosPago } = await query(
    `SELECT id_medio_pago, marca, ultimos_4, estado, fecha_inscripcion
     FROM medio_pago WHERE id_cliente = $1 ORDER BY fecha_inscripcion DESC`,
    [cliente.id_cliente],
  );

  return {
    suscripciones: resumen,
    deuda_total: resumen.reduce((total, s) => total + s.deuda, 0),
    cuotas_pendientes: cuotasPendientes,
    pagos,
    medio_pago: mediosPago.find((m) => m.estado === 'activo') ?? null,
    medios_pago: mediosPago,
  };
}

// Última mantención finalizada y próxima programada por planta (HU-09)
export async function mantenciones(idUsuario) {
  const cliente = await fichaCliente(idUsuario);
  const { rows } = await query(
    `SELECT p.id_planta, p.direccion, co.nombre AS comuna,
            (SELECT json_build_object('fecha', m.fecha_ejecucion, 'tipo', m.tipo, 'actividades', m.actividades)
             FROM mantencion m
             WHERE m.id_planta = p.id_planta AND m.estado = 'finalizada'
             ORDER BY m.fecha_ejecucion DESC LIMIT 1) AS ultima,
            (SELECT json_build_object('fecha', m.fecha_programada, 'tipo', m.tipo, 'estado', m.estado)
             FROM mantencion m
             WHERE m.id_planta = p.id_planta AND m.estado IN ('pendiente', 'en_curso')
             ORDER BY m.fecha_programada LIMIT 1) AS proxima
     FROM planta p
     JOIN comuna co ON co.id_comuna = p.id_comuna
     WHERE p.id_cliente = $1
     ORDER BY p.direccion`,
    [cliente.id_cliente],
  );
  return rows;
}

// Solicitud de mantención (HU-11): queda pendiente y visible para el administrador
export async function crearSolicitud(idUsuario, { id_planta, motivo }) {
  if (!Number.isInteger(id_planta) || id_planta <= 0) throw new HttpError(400, 'id_planta inválido');
  const texto = typeof motivo === 'string' ? motivo.trim() : '';
  if (!texto) throw new HttpError(400, 'Describe el motivo de la solicitud');

  await obtenerPlanta(idUsuario, id_planta); // valida pertenencia

  const { rows } = await query(
    `INSERT INTO solicitud_mantencion (id_planta, motivo) VALUES ($1, $2) RETURNING *`,
    [id_planta, texto],
  );
  return rows[0];
}

export async function misSolicitudes(idUsuario) {
  const cliente = await fichaCliente(idUsuario);
  const { rows } = await query(
    `SELECT sm.*, p.direccion
     FROM solicitud_mantencion sm
     JOIN planta p ON p.id_planta = sm.id_planta
     WHERE p.id_cliente = $1
     ORDER BY sm.fecha_solicitud DESC`,
    [cliente.id_cliente],
  );
  return rows;
}

// Cancelación en dos pasos desde la interfaz (HU-12): es definitiva y registra la fecha
export async function cancelarSuscripcion(idUsuario, idSuscripcion) {
  const cliente = await fichaCliente(idUsuario);
  const { rows } = await query(
    `UPDATE suscripcion s
     SET estado = 'cancelada', fecha_cancelacion = CURRENT_DATE
     FROM planta p
     WHERE s.id_suscripcion = $1 AND p.id_planta = s.id_planta
       AND p.id_cliente = $2 AND s.estado <> 'cancelada'
     RETURNING s.*`,
    [idSuscripcion, cliente.id_cliente],
  );
  if (!rows.length) throw new HttpError(404, 'Suscripción no encontrada o ya cancelada');
  return rows[0];
}

// Aceptar condiciones e inscribir el medio de pago en la pasarela (HU-13, RF-19).
// Guarda la aceptación con fecha e IP y devuelve la URL de la pasarela.
export async function iniciarInscripcion(idUsuario, idSuscripcion, { acepta_condiciones, version_condiciones }, ip) {
  if (acepta_condiciones !== true) {
    throw new HttpError(400, 'Debes aceptar las condiciones del servicio para continuar');
  }
  const cliente = await fichaCliente(idUsuario);

  const { rows } = await query(
    `SELECT s.id_suscripcion
     FROM suscripcion s
     JOIN planta p ON p.id_planta = s.id_planta
     WHERE s.id_suscripcion = $1 AND p.id_cliente = $2 AND s.estado <> 'cancelada'`,
    [idSuscripcion, cliente.id_cliente],
  );
  if (!rows.length) throw new HttpError(404, 'Suscripción no encontrada o cancelada');

  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    await conexion.query(
      `INSERT INTO aceptacion_condiciones (id_suscripcion, version_condiciones, ip_origen)
       VALUES ($1, $2, $3)`,
      [idSuscripcion, version_condiciones ?? '1.0', ip ?? null],
    );
    const inscripcion = await pasarela.iniciarInscripcion({
      idCliente: cliente.id_cliente,
      idSuscripcion,
      email: null,
      nombre: cliente.nombre,
      urlRetorno: `${process.env.APP_URL ?? ''}/cliente/cuenta`,
    });
    if (inscripcion.proveedor === 'flow-sandbox') {
      await conexion.query('UPDATE cliente SET flow_customer_id = $1 WHERE id_cliente = $2', [
        inscripcion.customerId,
        cliente.id_cliente,
      ]);
    }
    await conexion.query('COMMIT');
    return { url_pasarela: inscripcion.url_pasarela, proveedor: inscripcion.proveedor };
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }
}
