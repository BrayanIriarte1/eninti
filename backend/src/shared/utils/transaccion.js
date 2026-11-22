import { pool } from '../../config/db.js';

// Ejecuta fn(conexion) dentro de una transacción: todo o nada, y libera la conexión siempre
export async function enTransaccion(fn) {
  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    const resultado = await fn(conexion);
    await conexion.query('COMMIT');
    return resultado;
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }
}
