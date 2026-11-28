// Apoyo común de las pruebas de integración: levanta la API en un puerto libre sobre la base
// desechable que prepara scripts/integracion.js y entrega utilidades para pedir y consultar.
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';
import { query, pool } from '../../src/config/db.js';

export { query };

export async function iniciar() {
  const servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  const base = `http://127.0.0.1:${servidor.address().port}/api`;

  // Token firmado igual que en el inicio de sesión (evita el límite de intentos del login)
  const tokenDe = async (email) => {
    const { rows: [u] } = await query('SELECT id_usuario, rol FROM usuario WHERE email = $1', [email]);
    return jwt.sign({ id: u.id_usuario, rol: u.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
  };

  const pedir = async (metodo, ruta, token, cuerpo) => {
    const r = await fetch(base + ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };

  const cerrar = async () => {
    await new Promise((r) => servidor.close(r));
    await pool.end();
  };

  return { pedir, tokenDe, cerrar };
}

// Usuarios de los datos de prueba (database/seeds)
export const CORREOS = {
  admin: 'admin@eninti.test',
  maria: 'maria.gonzalez@ejemplo.cl',
  luis: 'luis.perez@ejemplo.cl',
  pedro: 'pedro.ramirez@eninti.test',
};

// Foto mínima válida (PNG de 1 × 1) para terminar una orden
export const FOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
