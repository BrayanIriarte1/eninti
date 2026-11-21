import { pool } from '../../config/db.js';

// Reglas de deuda de las suscripciones:
//   · Una cuota pendiente cuyo plazo pasó queda 'vencida'.
//   · Con alguna cuota vencida la suscripción sigue activa, pero 'con_deuda'.
//   · Al pagar todas las vencidas vuelve de inmediato a 'al_dia'.
//   · Si la deuda más antigua supera un mes, la suscripción se cancela por morosidad,
//     se anulan las cuotas futuras y la deuda vencida se mantiene por cobrar.
// Para volver a tener suscripción, el cliente envía una solicitud que el administrador acepta.
// Es idempotente: se ejecuta al iniciar la API, cada hora y después de cada pago o cobro.

const HAY_VENCIDA = `EXISTS (SELECT 1 FROM cuota c WHERE c.id_suscripcion = s.id_suscripcion AND c.estado = 'vencida')`;

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
                     AND c.fecha_vencimiento + interval '1 month' < CURRENT_DATE)
     RETURNING s.id_suscripcion`,
  );
  if (canceladas.length) await anularCuotasFuturas(conexion, canceladas.map((c) => c.id_suscripcion));

  await recalcularEstado(conexion);
  return { canceladas_por_morosidad: canceladas.length };
}

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

// Ejecución periódica (cada hora) para que la cancelación por morosidad sea automática
export function programarReglasDeuda() {
  const ejecutar = () => aplicarReglasDeuda().catch((err) => console.error('Reglas de deuda:', err.message));
  ejecutar();
  return setInterval(ejecutar, 60 * 60 * 1000).unref();
}
