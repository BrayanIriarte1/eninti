import { query } from '../../config/db.js';
import { verificarPassword } from './password.js';

// Cuentas de los datos de prueba (database/seeds/001_datos_prueba.sql) con su contraseña
// publicada en el README. En un servidor público cualquiera podría entrar con ellas.
export const CUENTAS_DEMO = {
  'admin@eninti.test': 'Admin.2026',
  'pedro.ramirez@eninti.test': 'Trabajador.2026',
  'maria.gonzalez@ejemplo.cl': 'Cliente.2026',
  'luis.perez@ejemplo.cl': 'Cliente.2026',
};

// Devuelve los correos de las cuentas activas que siguen con la contraseña de demostración
export async function cuentasConClaveDemo() {
  const { rows } = await query(
    'SELECT email, password_hash FROM usuario WHERE activo AND email = ANY($1)',
    [Object.keys(CUENTAS_DEMO)],
  );
  const expuestas = [];
  for (const u of rows) {
    if (await verificarPassword(CUENTAS_DEMO[u.email], u.password_hash)) expuestas.push(u.email);
  }
  return expuestas;
}
