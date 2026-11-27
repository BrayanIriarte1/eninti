// Respaldo lógico de la base de datos con pg_dump (RNF-09, riesgo R7).
// Uso: npm run db:respaldo   → crea respaldos/eninti-AAAA-MM-DD_HHMM.sql en la raíz del repositorio.
// Requiere pg_dump instalado (viene con PostgreSQL) y DATABASE_URL en .env.
// Los archivos de respaldo contienen datos y hashes: están excluidos de Git (.gitignore).
// Para restaurar en una base vacía:  psql "<DATABASE_URL>" -f respaldos/<archivo>.sql
import { spawn } from 'node:child_process';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

const RETENCION_DIAS = 14;
const carpeta = join(import.meta.dirname, '..', '..', 'respaldos');

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}

await mkdir(carpeta, { recursive: true });
const sello = new Date().toLocaleString('sv-SE', { timeZone: process.env.APP_TZ ?? 'America/Santiago' })
  .replace(' ', '_').replace(/:/g, '').slice(0, 15);
const archivo = join(carpeta, `eninti-${sello}.sql`);

const codigo = await new Promise((resolve) => {
  const proceso = spawn('pg_dump', ['--no-owner', '--no-privileges', '--file', archivo, process.env.DATABASE_URL], {
    stdio: 'inherit',
  });
  proceso.on('error', (err) => {
    console.error(`No se pudo ejecutar pg_dump (${err.message}). ¿Está PostgreSQL en el PATH?`);
    resolve(1);
  });
  proceso.on('close', resolve);
});
if (codigo !== 0) process.exit(codigo);

const { size } = await stat(archivo);
console.log(`✔ Respaldo creado: ${archivo} (${Math.round(size / 1024)} KB)`);

// Retención: se borran los respaldos con más de RETENCION_DIAS días
const limite = Date.now() - RETENCION_DIAS * 24 * 60 * 60 * 1000;
for (const nombre of await readdir(carpeta)) {
  if (!/^eninti-.*\.sql$/.test(nombre)) continue;
  const ruta = join(carpeta, nombre);
  if ((await stat(ruta)).mtimeMs < limite) {
    await rm(ruta);
    console.log(`  · eliminado por antigüedad: ${nombre}`);
  }
}
