import { query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';

const ESTADOS = ['al_dia', 'morosa', 'cancelada'];
const esMonto = (v) => Number.isInteger(v) && v > 0;
const esDiaCobro = (v) => Number.isInteger(v) && v >= 1 && v <= 28;

// Historial completo de suscripciones de una planta, la vigente primero
export async function listarPorPlanta(idPlanta) {
  const { rows: planta } = await query('SELECT 1 FROM planta WHERE id_planta = $1', [idPlanta]);
  if (!planta.length) throw new HttpError(404, 'Planta no encontrada');

  const { rows } = await query(
    `SELECT * FROM suscripcion
     WHERE id_planta = $1
     ORDER BY (estado = 'cancelada'), fecha_inicio DESC`,
    [idPlanta],
  );
  return rows;
}

export async function crear(idPlanta, { monto_mensual, fecha_inicio, dia_cobro }) {
  if (!esMonto(monto_mensual)) throw new HttpError(400, 'monto_mensual debe ser un entero mayor a 0');
  if (dia_cobro !== undefined && !esDiaCobro(dia_cobro)) {
    throw new HttpError(400, 'dia_cobro debe estar entre 1 y 28');
  }
  if (fecha_inicio !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(fecha_inicio)) {
    throw new HttpError(400, 'fecha_inicio debe tener formato YYYY-MM-DD');
  }

  const { rows: planta } = await query('SELECT 1 FROM planta WHERE id_planta = $1', [idPlanta]);
  if (!planta.length) throw new HttpError(404, 'Planta no encontrada');

  try {
    const { rows } = await query(
      `INSERT INTO suscripcion (id_planta, monto_mensual, fecha_inicio, dia_cobro)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), COALESCE($4::smallint, 1))
       RETURNING *`,
      [idPlanta, monto_mensual, fecha_inicio ?? null, dia_cobro ?? null],
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'La planta ya tiene una suscripción vigente');
    throw err;
  }
}

// Cambia la cuota, el día de cobro o el estado. Cancelar registra la fecha (HU-12) y es definitivo.
export async function actualizar(id, { monto_mensual, dia_cobro, estado }) {
  if (monto_mensual === undefined && dia_cobro === undefined && estado === undefined) {
    throw new HttpError(400, 'Indica monto_mensual, dia_cobro o estado');
  }
  if (monto_mensual !== undefined && !esMonto(monto_mensual)) {
    throw new HttpError(400, 'monto_mensual debe ser un entero mayor a 0');
  }
  if (dia_cobro !== undefined && !esDiaCobro(dia_cobro)) {
    throw new HttpError(400, 'dia_cobro debe estar entre 1 y 28');
  }
  if (estado !== undefined && !ESTADOS.includes(estado)) {
    throw new HttpError(400, `estado debe ser uno de: ${ESTADOS.join(', ')}`);
  }

  // La condición estado <> 'cancelada' en el WHERE evita modificar una suscripción ya cancelada
  const { rows } = await query(
    `UPDATE suscripcion
     SET monto_mensual = COALESCE($2, monto_mensual),
         dia_cobro = COALESCE($3::smallint, dia_cobro),
         estado = COALESCE($4, estado),
         fecha_cancelacion = CASE WHEN $4 = 'cancelada' THEN CURRENT_DATE ELSE fecha_cancelacion END
     WHERE id_suscripcion = $1 AND estado <> 'cancelada'
     RETURNING *`,
    [id, monto_mensual ?? null, dia_cobro ?? null, estado ?? null],
  );
  if (rows.length) return rows[0];

  const { rows: existe } = await query('SELECT 1 FROM suscripcion WHERE id_suscripcion = $1', [id]);
  if (!existe.length) throw new HttpError(404, 'Suscripción no encontrada');
  throw new HttpError(409, 'La suscripción está cancelada');
}
