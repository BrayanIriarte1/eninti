import { pool, query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import { validarTokenInscripcion } from './pasarela.service.js';

// Confirmación de la pasarela simulada (HU-13). El token JWT emitido al iniciar la
// inscripción autoriza esta llamada; una notificación repetida no duplica el medio de pago.
export async function confirmarInscripcionSimulada(token, { resultado, marca, ultimos_4 }) {
  const datos = validarTokenInscripcion(token);

  if (!['aprobada', 'rechazada'].includes(resultado)) {
    throw new HttpError(400, 'resultado debe ser aprobada o rechazada');
  }
  if (resultado === 'aprobada' && !/^[0-9]{4}$/.test(ultimos_4 ?? '')) {
    throw new HttpError(400, 'ultimos_4 debe ser 4 dígitos');
  }

  const tokenPasarela = `sim-tok-${datos.nonce}`;

  // Idempotencia: si la pasarela notifica dos veces, se devuelve el registro existente
  const { rows: previo } = await query('SELECT * FROM medio_pago WHERE token_pasarela = $1', [tokenPasarela]);
  if (previo.length) return previo[0];

  const estado = resultado === 'aprobada' ? 'activo' : 'rechazado';
  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    if (estado === 'activo') {
      // Un solo medio de pago activo por cliente: el nuevo reemplaza al anterior
      await conexion.query(
        `UPDATE medio_pago SET estado = 'inactivo' WHERE id_cliente = $1 AND estado = 'activo'`,
        [datos.idCliente],
      );
    }
    const { rows } = await conexion.query(
      `INSERT INTO medio_pago (id_cliente, token_pasarela, marca, ultimos_4, estado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [datos.idCliente, tokenPasarela, marca?.trim() || null, estado === 'activo' ? ultimos_4 : null, estado],
    );
    await conexion.query('COMMIT');
    return rows[0];
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }
}
