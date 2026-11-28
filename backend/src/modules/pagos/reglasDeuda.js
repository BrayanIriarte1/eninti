// REGLAS DE DEUDA (CU-18, CU-08, CU-32). Para cambiar el plazo de morosidad: interval '1 month'.
import { pool } from '../../config/db.js';

// Reglas de deuda de las suscripciones:
//   · Una cuota pendiente cuyo plazo pasó queda 'vencida'.
//   · Con alguna cuota vencida la suscripción sigue activa, pero 'con_deuda'.
//   · Al pagar todas las vencidas vuelve de inmediato a 'al_dia'.
//   · Si la deuda más antigua supera un mes Y no se pudo cobrar, la suscripción se cancela
//     por morosidad, se anulan las cuotas futuras y la deuda vencida se mantiene por cobrar.
//     «No se pudo cobrar» = el cliente no tiene tarjeta activa, o ya se intentó cargar esa
//     cuota y falló (rechazo, error o un cobro en espera descartado). Si tiene tarjeta y aún
//     no se intentó (p. ej. el servidor estuvo apagado), primero se cobra: no se cancela a
//     quien sí puede pagar. La suscripción sigue «con_deuda» hasta el próximo cobro.
// Para volver a tener suscripción, el cliente envía una solicitud que el administrador acepta.
// Es idempotente: se ejecuta al iniciar la API, cada hora y después de cada pago o cobro.

const HAY_VENCIDA = `EXISTS (SELECT 1 FROM cuota c WHERE c.id_suscripcion = s.id_suscripcion AND c.estado = 'vencida')`;

// [CU-18] 1) pendiente vencida → vencida 2) deuda > 1 mes → cancelada por morosidad 3) recalcula estados.
export async function aplicarReglasDeuda(conexion = pool) {
  await conexion.query(
    `UPDATE cuota SET estado = 'vencida' WHERE estado = 'pendiente' AND fecha_vencimiento < CURRENT_DATE`,
  );

  const { rows: canceladas } = await conexion.query(
    `UPDATE suscripcion s
     SET estado = 'cancelada', fecha_cancelacion = CURRENT_DATE, motivo_cancelacion = 'morosidad'
     WHERE s.estado <> 'cancelada'
       AND EXISTS (SELECT 1 FROM cuota c
                   WHERE c.id_suscripcion = s.id_suscripcion AND c.estado = 'vencida'
                     AND c.fecha_vencimiento + interval '1 month' < CURRENT_DATE
                     AND (
                       -- sin tarjeta activa: no hay cómo cobrarla
                       NOT EXISTS (SELECT 1 FROM planta p
                                   JOIN medio_pago mp ON mp.id_cliente = p.id_cliente AND mp.estado = 'activo'
                                   WHERE p.id_planta = s.id_planta)
                       -- con tarjeta: solo si ya se intentó cobrar esa cuota y falló
                       OR EXISTS (SELECT 1 FROM intento_cargo ic
                                  WHERE ic.id_cuota = c.id_cuota
                                    AND ic.resultado IN ('rechazado', 'error', 'descartado'))
                     ))
     RETURNING s.id_suscripcion`,
  );
  if (canceladas.length) await cerrarSuscripciones(conexion, canceladas.map((c) => c.id_suscripcion), null);

  await recalcularEstado(conexion);
  return { canceladas_por_morosidad: canceladas.length };
}

// [CU-18, CU-22] con alguna cuota vencida → con_deuda; sin vencidas → al_dia.
// Recalcula 'al_dia' / 'con_deuda' de las suscripciones vigentes (todas o una)
export async function recalcularEstado(conexion = pool, idSuscripcion = null) {
  await conexion.query(
    `UPDATE suscripcion s
     SET estado = CASE WHEN ${HAY_VENCIDA} THEN 'con_deuda' ELSE 'al_dia' END
     WHERE s.estado <> 'cancelada' AND ($1::int IS NULL OR s.id_suscripcion = $1)`,
    [idSuscripcion],
  );
}

// Al cancelar, las cuotas aún no vencidas dejan de cobrarse
export async function anularCuotasFuturas(conexion, ids) {
  await conexion.query(
    `UPDATE cuota SET estado = 'anulada' WHERE id_suscripcion = ANY($1::int[]) AND estado = 'pendiente'`,
    [ids],
  );
}

// [CU-08, CU-32]
// Efectos de cancelar suscripciones (por el cliente, el administrador o por morosidad):
// se anulan las cuotas futuras y se cancelan las mantenciones preventivas aún pendientes,
// que eran parte del servicio. Las correctivas y las visitas en curso no se tocan.
// idUsuario es quien cancela; NULL cuando lo hace el proceso automático de morosidad.
export async function cerrarSuscripciones(conexion, ids, idUsuario) {
  await anularCuotasFuturas(conexion, ids);
  const { rows: preventivas } = await conexion.query(
    `UPDATE mantencion m SET estado = 'cancelada'
     FROM suscripcion s
     WHERE s.id_suscripcion = ANY($1::int[]) AND m.id_planta = s.id_planta
       AND m.tipo = 'preventiva' AND m.estado = 'pendiente'
     RETURNING m.id_mantencion`,
    [ids],
  );
  for (const { id_mantencion } of preventivas) {
    await conexion.query(
      `INSERT INTO mantencion_historial (id_mantencion, id_usuario, estado_anterior, estado_nuevo, comentario)
       VALUES ($1, $2, 'pendiente', 'cancelada', 'Suscripción cancelada: la preventiva ya no corresponde')`,
      [id_mantencion, idUsuario],
    );
  }
  return preventivas.length;
}

// Ejecución periódica (cada hora) para que la cancelación por morosidad sea automática
export function programarReglasDeuda() {
  const ejecutar = () => aplicarReglasDeuda().catch((err) => console.error('Reglas de deuda:', err.message));
  ejecutar();
  return setInterval(ejecutar, 60 * 60 * 1000).unref();
}
