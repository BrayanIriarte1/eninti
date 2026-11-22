import { pool, query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import * as pasarela from '../pagos/pasarela.service.js';
import { aplicarReglasDeuda, cerrarSuscripciones } from '../pagos/reglasDeuda.js';
import { puedeTransitar } from '../../shared/utils/estadosOrden.js';
import { enTransaccion } from '../../shared/utils/transaccion.js';
import { fotosDeOrden } from '../../shared/utils/fotos.js';
import { telefonoValido } from '../../shared/utils/rut.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const texto = (v) => (typeof v === 'string' ? v.trim() : '');

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
  await aplicarReglasDeuda();

  const { rows: resumen } = await query(
    `SELECT s.id_suscripcion, s.id_planta, s.estado, s.monto_mensual, s.fecha_inicio,
            s.fecha_cancelacion, s.motivo_cancelacion, p.direccion, co.nombre AS comuna,
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

  const { rows: solicitudesSuscripcion } = await query(
    `SELECT ss.id_solicitud_suscripcion, ss.id_planta, ss.estado, ss.mensaje, ss.respuesta,
            ss.fecha_solicitud, ss.fecha_resolucion, p.direccion
     FROM solicitud_suscripcion ss
     JOIN planta p ON p.id_planta = ss.id_planta
     WHERE p.id_cliente = $1
     ORDER BY ss.fecha_solicitud DESC`,
    [cliente.id_cliente],
  );

  // Plantas sin suscripción vigente: el cliente puede pedir una (la otorga el administrador)
  const { rows: plantasSinSuscripcion } = await query(
    `SELECT p.id_planta, p.direccion, co.nombre AS comuna
     FROM planta p
     JOIN comuna co ON co.id_comuna = p.id_comuna
     WHERE p.id_cliente = $1
       AND NOT EXISTS (SELECT 1 FROM suscripcion s WHERE s.id_planta = p.id_planta AND s.estado <> 'cancelada')
     ORDER BY p.direccion`,
    [cliente.id_cliente],
  );

  return {
    suscripciones: resumen,
    solicitudes_suscripcion: solicitudesSuscripcion,
    plantas_sin_suscripcion: plantasSinSuscripcion,
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

// Cancelación en dos pasos desde la interfaz (HU-12): es definitiva y registra fecha y motivo.
// Para volver a suscribirse, el cliente envía una solicitud que el administrador acepta.
export async function cancelarSuscripcion(idUsuario, idSuscripcion) {
  const cliente = await fichaCliente(idUsuario);
  // Cancelación, anulación de cuotas futuras y de preventivas pendientes en una sola transacción
  return enTransaccion(async (conexion) => {
    const { rows } = await conexion.query(
      `UPDATE suscripcion s
       SET estado = 'cancelada', fecha_cancelacion = CURRENT_DATE, motivo_cancelacion = 'cliente'
       FROM planta p
       WHERE s.id_suscripcion = $1 AND p.id_planta = s.id_planta
         AND p.id_cliente = $2 AND s.estado <> 'cancelada'
       RETURNING s.*`,
      [idSuscripcion, cliente.id_cliente],
    );
    if (!rows.length) throw new HttpError(404, 'Suscripción no encontrada o ya cancelada');
    await cerrarSuscripciones(conexion, [idSuscripcion], idUsuario);
    return rows[0];
  });
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

  const { rows: cuenta } = await query('SELECT email FROM usuario WHERE id_usuario = $1', [idUsuario]);

  // Primero la pasarela (sin transacción abierta mientras se espera a Flow). El customerId de
  // Flow se guarda apenas se crea, para no duplicar el cliente en Flow si algo falla después.
  const inscripcion = await pasarela.iniciarInscripcion({
    idCliente: cliente.id_cliente,
    idSuscripcion,
    email: cuenta[0]?.email ?? null,
    nombre: cliente.nombre,
    flowCustomerId: cliente.flow_customer_id,
  });
  if (inscripcion.proveedor === 'flow-sandbox' && inscripcion.customerId !== cliente.flow_customer_id) {
    await query('UPDATE cliente SET flow_customer_id = $1 WHERE id_cliente = $2', [inscripcion.customerId, cliente.id_cliente]);
  }

  // Consentimiento informado con fecha, versión e IP (RF-19, Ley 21.719)
  const version = typeof version_condiciones === 'string' && version_condiciones.trim()
    ? version_condiciones.trim().slice(0, 10)
    : '1.0';
  await query(
    `INSERT INTO aceptacion_condiciones (id_suscripcion, version_condiciones, ip_origen) VALUES ($1, $2, $3)`,
    [idSuscripcion, version, ip ? String(ip).slice(0, 45) : null],
  );
  return { url_pasarela: inscripcion.url_pasarela, proveedor: inscripcion.proveedor };
}

// ------------------------------------------------------------ Cierre de órdenes

// Órdenes terminadas por el técnico que esperan la confirmación del cliente, con sus fotos
export async function ordenesPorConfirmar(idUsuario) {
  const cliente = await fichaCliente(idUsuario);
  const { rows } = await query(
    `SELECT m.id_mantencion, m.tipo, m.fecha_programada, m.fecha_ejecucion, m.actividades, m.observaciones,
            p.direccion, co.nombre AS comuna, u.nombre AS trabajador, sm.motivo AS motivo_solicitud
     FROM mantencion m
     JOIN planta p  ON p.id_planta = m.id_planta
     JOIN comuna co ON co.id_comuna = p.id_comuna
     LEFT JOIN usuario u ON u.id_usuario = m.id_trabajador
     LEFT JOIN solicitud_mantencion sm ON sm.id_solicitud = m.id_solicitud
     WHERE p.id_cliente = $1 AND m.estado = 'por_confirmar'
     ORDER BY m.fecha_ejecucion`,
    [cliente.id_cliente],
  );
  for (const orden of rows) orden.fotos = await fotosDeOrden({ query }, orden.id_mantencion);
  return rows;
}

// El cliente cierra la orden: si el problema quedó resuelto pasa a 'finalizada';
// si no, vuelve a 'en_curso' para que el técnico regrese, con el comentario del cliente.
export async function confirmarOrden(idUsuario, idMantencion, { satisfecho, problema_resuelto, comentario }) {
  if (typeof satisfecho !== 'boolean' || typeof problema_resuelto !== 'boolean') {
    throw new HttpError(400, 'Indica si quedaste satisfecho y si el problema se resolvió');
  }
  const nota = texto(comentario);
  if (nota.length > 500) throw new HttpError(400, 'El comentario admite hasta 500 caracteres');
  if (!problema_resuelto && !nota) {
    throw new HttpError(400, 'Cuéntanos qué sigue fallando para que el técnico vuelva');
  }
  const cliente = await fichaCliente(idUsuario);
  const destino = problema_resuelto ? 'finalizada' : 'en_curso';

  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    const { rows } = await conexion.query(
      `SELECT m.estado, m.id_solicitud FROM mantencion m
       JOIN planta p ON p.id_planta = m.id_planta
       WHERE m.id_mantencion = $1 AND p.id_cliente = $2
       FOR UPDATE OF m`,
      [idMantencion, cliente.id_cliente],
    );
    if (!rows.length) throw new HttpError(404, 'Orden no encontrada');
    if (rows[0].estado !== 'por_confirmar' || !puedeTransitar(rows[0].estado, destino)) {
      throw new HttpError(409, 'Esta orden no está esperando tu confirmación');
    }
    await conexion.query(
      `UPDATE mantencion
       SET estado = $2, satisfecho = $3, problema_resuelto = $4, comentario_cliente = $5, fecha_confirmacion = now()
       WHERE id_mantencion = $1`,
      [idMantencion, destino, satisfecho, problema_resuelto, nota || null],
    );
    if (problema_resuelto && rows[0].id_solicitud) {
      await conexion.query(`UPDATE solicitud_mantencion SET estado = 'cerrada' WHERE id_solicitud = $1`, [rows[0].id_solicitud]);
    }
    const resumen = problema_resuelto
      ? `Cliente confirma: problema resuelto, ${satisfecho ? 'quedó satisfecho' : 'no quedó satisfecho'}`
      : 'Cliente informa que el problema sigue';
    await conexion.query(
      `INSERT INTO mantencion_historial (id_mantencion, id_usuario, estado_anterior, estado_nuevo, comentario)
       VALUES ($1, $2, 'por_confirmar', $3, $4)`,
      [idMantencion, idUsuario, destino, (nota ? `${resumen}: ${nota}` : resumen).slice(0, 255)],
    );
    await conexion.query('COMMIT');
    return { id_mantencion: idMantencion, estado: destino };
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }
}

// ------------------------------------------------------------ Solicitud de suscripción

// Solo el administrador otorga suscripciones: el cliente envía una solicitud por planta
export async function solicitarSuscripcion(idUsuario, { id_planta, mensaje }) {
  if (!Number.isInteger(id_planta) || id_planta <= 0) throw new HttpError(400, 'id_planta inválido');
  const nota = texto(mensaje);
  if (nota.length > 500) throw new HttpError(400, 'El mensaje admite hasta 500 caracteres');
  const cliente = await fichaCliente(idUsuario);

  const { rows: planta } = await query(
    `SELECT p.id_planta,
            EXISTS (SELECT 1 FROM suscripcion s WHERE s.id_planta = p.id_planta AND s.estado <> 'cancelada') AS vigente
     FROM planta p WHERE p.id_planta = $1 AND p.id_cliente = $2`,
    [id_planta, cliente.id_cliente],
  );
  if (!planta.length) throw new HttpError(404, 'Planta no encontrada');
  if (planta[0].vigente) throw new HttpError(409, 'Esta planta ya tiene una suscripción vigente');

  try {
    const { rows } = await query(
      `INSERT INTO solicitud_suscripcion (id_planta, mensaje) VALUES ($1, $2) RETURNING *`,
      [id_planta, nota || null],
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'Ya enviaste una solicitud para esta planta. El administrador te responderá');
    throw err;
  }
}

// ------------------------------------------------------------ Cambio de datos

export async function misDatos(idUsuario) {
  const cliente = await fichaCliente(idUsuario);
  const { rows: usuario } = await query('SELECT email FROM usuario WHERE id_usuario = $1', [idUsuario]);
  const { rows: solicitudes } = await query(
    `SELECT id_solicitud_cambio, email_nuevo, telefono_nuevo, motivo, estado, respuesta,
            fecha_solicitud, fecha_resolucion
     FROM solicitud_cambio_datos WHERE id_cliente = $1 ORDER BY fecha_solicitud DESC`,
    [cliente.id_cliente],
  );
  return {
    nombre: cliente.nombre,
    rut: cliente.rut,
    email: usuario[0]?.email,
    telefono: cliente.telefono,
    direccion: cliente.direccion,
    solicitudes,
  };
}

// El cliente pide cambiar su correo o su teléfono; se aplica cuando el administrador lo aprueba
export async function solicitarCambioDatos(idUsuario, { email, telefono, motivo }) {
  const actuales = await misDatos(idUsuario);
  const correo = texto(email).toLowerCase();
  const fono = texto(telefono).replace(/\s/g, '');
  const razon = texto(motivo);

  const errores = [];
  if (correo && !EMAIL.test(correo)) errores.push('El correo no es válido');
  if (fono && !telefonoValido(fono)) errores.push('El teléfono debe incluir el código de país, por ejemplo +56912345678');
  if (!razon) errores.push('Indica el motivo del cambio');
  if (razon.length > 300) errores.push('El motivo admite hasta 300 caracteres');
  const cambiaCorreo = Boolean(correo) && correo !== actuales.email;
  const cambiaFono = Boolean(fono) && fono !== actuales.telefono;
  if (!errores.length && !cambiaCorreo && !cambiaFono) errores.push('Escribe un correo o un teléfono distinto al actual');
  if (errores.length) throw new HttpError(400, 'Datos de la solicitud inválidos', errores);

  if (cambiaCorreo) {
    const { rows } = await query('SELECT 1 FROM usuario WHERE lower(email) = $1', [correo]);
    if (rows.length) throw new HttpError(409, 'Ese correo ya está en uso por otra cuenta');
  }

  const cliente = await fichaCliente(idUsuario);
  try {
    const { rows } = await query(
      `INSERT INTO solicitud_cambio_datos (id_cliente, email_nuevo, telefono_nuevo, motivo)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [cliente.id_cliente, cambiaCorreo ? correo : null, cambiaFono ? fono : null, razon],
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'Ya tienes una solicitud de cambio pendiente');
    throw err;
  }
}
