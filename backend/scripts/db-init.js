// Ejecuta en orden los scripts de database/schema y database/seeds.
// Uso: npm run db:init   (requiere DATABASE_URL en .env y la base de datos ya creada)
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pool } from '../src/config/db.js';

const raiz = join(import.meta.dirname, '..', '..', 'database');

for (const carpeta of ['schema', 'seeds']) {
  const archivos = (await readdir(join(raiz, carpeta))).filter((f) => f.endsWith('.sql')).sort();
  for (const archivo of archivos) {
    await pool.query(await readFile(join(raiz, carpeta, archivo), 'utf8'));
    console.log(`✔ ${carpeta}/${archivo}`);
  }
}

await pool.end();
