// Ejecuta en orden los scripts de database/schema y database/seeds.
// Uso: npm run db:init   (requiere DATABASE_URL en .env y la base de datos ya creada)
//
// Todos los scripts se pueden ejecutar varias veces: las migraciones usan IF NOT EXISTS y los
// datos de prueba solo se cargan si sus tablas están vacías. Por eso Render lo ejecuta en cada
// arranque (render.yaml): una base nueva queda lista y una existente recibe las migraciones nuevas.
// Con --solo-esquema no se cargan los datos de prueba.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pool } from '../src/config/db.js';

const raiz = join(import.meta.dirname, '..', '..', 'database');
const carpetas = process.argv.includes('--solo-esquema') ? ['schema'] : ['schema', 'seeds'];

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL (en backend/.env o en las variables de entorno)');
  process.exit(1);
}

const cliente = await pool.connect();
try {
  // Si dos instancias arrancan a la vez, la segunda espera a que la primera termine
  await cliente.query('SELECT pg_advisory_lock(731000)');
  for (const carpeta of carpetas) {
    const archivos = (await readdir(join(raiz, carpeta))).filter((f) => f.endsWith('.sql')).sort();
    for (const archivo of archivos) {
      await cliente.query(await readFile(join(raiz, carpeta, archivo), 'utf8'));
      console.log(`✔ ${carpeta}/${archivo}`);
    }
  }
} finally {
  await cliente.query('SELECT pg_advisory_unlock(731000)').catch(() => {});
  cliente.release();
  await pool.end();
}
