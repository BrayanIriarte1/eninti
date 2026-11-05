import { pool, query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import * as pasarela from '../pagos/pasarela.service.js';

const PERIODO_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// Listado de impagos ordenado por antigüedad de la deuda (HU-01)
export async function impagos() {
  const { rows } = await query(
    `SELECT s.id_suscripcion, c.id_cliente, c.nombre AS cliente, c.rut, c.telefono,
            p.direccion, co.nombre AS comuna, s.estado AS estado_suscripcion,
            array_agg(cu.periodo ORDER BY cu.periodo) AS periodos,
            count(cu.id_cuota)::int AS meses_adeudados,
            sum(cu.monto)::int AS monto_total,
            min(cu.fecha_vencimiento) AS vencida_desde
     FROM cuota cu
     JOIN suscripcion s ON s.id_suscripcion = cu.id_suscripcion
     JOIN planta p  ON p.id_planta = s.id_planta
     JOIN cliente c ON c.id_cliente = p.id_cliente
     JOIN comuna co ON co.id_comuna = p.id_comuna
     WHERE cu.estado = 'vencida'
     GROUP BY s.id_suscripcion, c.id_cliente, p.direccion, co.nombre
     ORDER BY min(cu.fecha_vencimiento)`,
  );
  return rows;
}

// Cuotas de una suscripción (apoyo del panel de impagos y del registro manual)
export async function cuotasDeSuscripcion(idSuscripcion) {
  const { rows } = await query(
    `SELECT cu.*, p.direccion, c.nombre AS cliente
     FROM cuota cu
     JOIN suscripcion s ON s.id_suscripcion = cu.id_suscripcion
     JOIN planta p ON p.id_planta = s.id_planta
     JOIN cliente c ON c.id_cliente = p.id_cliente
     WHERE cu.id_suscripcion = $1
     ORDER BY cu.periodo DESC`,
    [idSuscripcion],
  );
  if (!rows.length) throw new HttpError(404, 'La suscripción no tiene cuotas generadas');
  return rows;
}

// Recalcula el estado de la suscripción según sus cuotas vencidas
async function actualizarEstadoSuscripcion(conexion, idSuscripcion) {
  await conexion.query(
    `UPDATE suscripcion s
     SET estado = CASE
       WHEN EXISTS (SELECT 1 FROM cuota WHERE id_suscripcion = s.id_suscripcion AND estado = 'vencida')
         THEN 'morosa' ELSE 'al_dia' END
     WHERE s.id_suscripcion = $1 AND s.estado <> 'cancelada'`,
    [idSuscripcion],
  );
}

// Registro manual de un pago por transferencia o efectivo (HU-02).
// Audita quién lo registró; una cuota pagada no admite un segundo pago.
export async function registrarPagoManual(idCuota, { origen, monto, referencia }, idAdmin) {
  if (!['transferencia', 'efectivo'].includes(origen)) {
    throw new HttpError(400, 'origen debe ser transferencia o efectivo');
  }
  if (monto !== undefined && (!Number.isInteger(monto) || monto <= 0)) {
    throw new HttpError(400, 'monto debe ser un entero mayor a 0');
  }

  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    const { rows } = await conexion.query('SELECT * FROM cuota WHERE id_cuota = $1 FOR UPDATE', [idCuota]);
    if (!rows.length) throw new HttpError(404, 'Cuota no encontrada');
    const cuota = rows[0];
    if (!['pendiente', 'vencida'].includes(cuota.estado)) {
      throw new HttpError(409, `La cuota ya está ${cuota.estado}`);
    }

    const { rows: pago } = await conexion.query(
      `INSERT INTO pago (id_cuota, registrado_por, origen, monto, referencia)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [idCuota, idAdmin, origen, monto ?? cuota.monto, referencia?.trim() || null],
    );
    await conexion.query(`UPDATE cuota SET estado = 'pagada' WHERE id_cuota = $1`, [idCuota]);
    await actualizarEstadoSuscripcion(conexion, cuota.id_suscripcion);
    await conexion.query('COMMIT');
    return pago[0];
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }
}

// Pagos recibidos en un mes para que el contador emita las boletas (HU-06)
export async function pagosDelMes(periodo) {
  if (!PERIODO_RE.test(periodo ?? '')) throw new HttpError(400, 'periodo debe tener formato YYYY-MM');
  const { rows } = await query(
    `SELECT pa.id_pago, pa.fecha_pago, c.nombre AS cliente, c.rut, pa.monto, pa.origen,
            pa.referencia, cu.periodo, p.direccion, u.nombre AS registrado_por
     FROM pago pa
     JOIN cuota cu ON cu.id_cuota = pa.id_cuota
     JOIN suscripcion s ON s.id_suscripcion = cu.id_suscripcion
     JOIN planta p ON p.id_planta = s.id_planta
     JOIN cliente c ON c.id_cliente = p.id_cliente
     LEFT JOIN usuario u ON u.id_usuario = pa.registrado_por
     WHERE to_char(pa.fecha_pago, 'YYYY-MM') = $1
     ORDER BY pa.fecha_pago`,
    [periodo],
  );
  return rows;
}

// Motor de facturación: genera las cuotas del período para las suscripciones no
// canceladas y marca como vencidas las cuotas pendientes cuyo plazo pasó.
// Es idempotente: la restricción UNIQUE (id_suscripcion, periodo) evita duplicados.
export async function generarCuotas({ periodo }) {
  if (!PERIODO_RE.test(periodo ?? '')) throw new HttpError(400, 'periodo debe tener formato YYYY-MM');

  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    const { rowCount: generadas } = await conexion.query(
      `INSERT INTO cuota (id_suscripcion, periodo, monto, fecha_vencimiento)
       SELECT s.id_suscripcion, $1::text, s.monto_mensual,
              make_date(split_part($1::text, '-', 1)::int, split_part($1::text, '-', 2)::int, s.dia_cobro)
       FROM suscripcion s
       WHERE s.estado <> 'cancelada'
         AND s.fecha_inicio <= make_date(split_part($1::text, '-', 1)::int, split_part($1::text, '-', 2)::int, 28)
       ON CONFLICT (id_suscripcion, periodo) DO NOTHING`,
      [periodo],
    );
    const { rowCount: vencidas } = await conexion.query(
      `UPDATE cuota SET estado = 'vencida'
       WHERE estado = 'pendiente' AND fecha_vencimiento < CURRENT_DATE`,
    );
    await conexion.query(
      `UPDATE suscripcion s
       SET estado = CASE
         WHEN EXISTS (SELECT 1 FROM cuota WHERE id_suscripcion = s.id_suscripcion AND estado = 'vencida')
           THEN 'morosa' ELSE 'al_dia' END
       WHERE s.estado <> 'cancelada'`,
    );
    await conexion.query('COMMIT');
    return { periodo, cuotas_generadas: generadas, cuotas_vencidas: vencidas };
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }
}

// Cobro recurrente (HU-13): intenta cargar en la pasarela cada cuota abierta de los
// clientes con medio de pago activo. Un rechazo no registra pago ni cambia la cuota.
export async function procesarCargos() {
  const { rows: pendientes } = await query(
    `SELECT cu.id_cuota, cu.monto, cu.periodo, cu.id_suscripcion,
            mp.id_medio_pago, mp.token_pasarela, mp.ultimos_4,
            c.nombre AS cliente, p.direccion
     FROM cuota cu
     JOIN suscripcion s ON s.id_suscripcion = cu.id_suscripcion AND s.estado <> 'cancelada'
     JOIN planta p  ON p.id_planta = s.id_planta
     JOIN cliente c ON c.id_cliente = p.id_cliente
     JOIN medio_pago mp ON mp.id_cliente = c.id_cliente AND mp.estado = 'activo'
     WHERE cu.estado IN ('pendiente', 'vencida')
     ORDER BY cu.fecha_vencimiento`,
  );

  const resultado = { intentos: pendientes.length, aprobados: 0, rechazados: 0, detalle: [] };

  for (const cuota of pendientes) {
    const cargo = await pasarela.cobrar({
      medioPago: cuota,
      monto: cuota.monto,
      descripcion: `Suscripción ENINTI ${cuota.periodo} · ${cuota.direccion}`,
    });

    if (cargo.aprobado) {
      const conexion = await pool.connect();
      try {
        await conexion.query('BEGIN');
        const { rowCount } = await conexion.query(
          `UPDATE cuota SET estado = 'pagada' WHERE id_cuota = $1 AND estado IN ('pendiente', 'vencida')`,
          [cuota.id_cuota],
        );
        if (rowCount) {
          await conexion.query(
            `INSERT INTO pago (id_cuota, id_medio_pago, origen, monto, referencia)
             VALUES ($1, $2, 'pasarela', $3, $4)`,
            [cuota.id_cuota, cuota.id_medio_pago, cuota.monto, cargo.referencia],
          );
          await actualizarEstadoSuscripcion(conexion, cuota.id_suscripcion);
        }
        await conexion.query('COMMIT');
        resultado.aprobados += 1;
      } catch (err) {
        await conexion.query('ROLLBACK');
        throw err;
      } finally {
        conexion.release();
      }
    } else {
      resultado.rechazados += 1;
    }
    resultado.detalle.push({
      cuota: cuota.id_cuota,
      periodo: cuota.periodo,
      cliente: cuota.cliente,
      monto: cuota.monto,
      resultado: cargo.aprobado ? 'aprobado' : 'rechazado',
      referencia: cargo.aprobado ? cargo.referencia : null,
    });
  }

  return resultado;
}
