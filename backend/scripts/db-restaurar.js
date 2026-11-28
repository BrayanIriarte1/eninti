// Restauración de un respaldo creado con npm run db:respaldo (RNF-09, riesgo R7).
//
//   npm run db:restaurar -- --verificar [archivo.sql]
//       Prueba de restauración SIN tocar nada: crea una base temporal, restaura el respaldo
//       (el último si no se indica), compara la cantidad de filas de cada tabla con la base
//       actual (DATABASE_URL) y borra la base temporal. Así se demuestra que el respaldo sirve.
//
//   npm run db:restaurar -- archivo.sql --destino <URL de una base VACÍA>
//       Restaura de verdad, solo sobre una base sin tablas (nunca sobrescribe datos).
import { spawn } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import pg from 'pg';
import { herramientaPg } from './pg-herramientas.js';

const carpeta = join(import.meta.dirname, '..', '..', 'respaldos');
const args = process.argv.slice(2);
const verificar = args.includes('--verificar');
const iDestino = args.indexOf('--destino');
const destino = iDestino >= 0 ? args[iDestino + 1] : null;
const archivoArg = args.find((a, i) => !a.startsWith('--') && i !== iDestino + 1);

function salir(mensaje) { console.error(mensaje); process.exit(1); }

if (!process.env.DATABASE_URL) salir('Falta DATABASE_URL (en backend/.env)');
if (!verificar && !destino) salir('Indica --verificar o --destino <URL de una base vacía>');
const psql = herramientaPg('psql');
if (!psql) salir('No se encontró psql. Instala PostgreSQL o define PG_BIN con la carpeta bin.');

async function ultimoRespaldo() {
  const nombres = (await readdir(carpeta).catch(() => [])).filter((n) => /^eninti-.*\.sql$/.test(n)).sort();
  if (!nombres.length) salir('No hay respaldos en la carpeta respaldos/. Crea uno con npm run db:respaldo');
  return join(carpeta, nombres.at(-1));
}

const conBase = (url, nombre) => { const u = new URL(url); u.pathname = '/' + nombre; return u.toString(); };

async function conCliente(url, fn) {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try { return await fn(c); } finally { await c.end(); }
}

const filasPorTabla = (url) => conCliente(url, async (c) => {
  const { rows } = await c.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
  const conteo = {};
  for (const { tablename } of rows) conteo[tablename] = (await c.query(`SELECT count(*)::int n FROM "${tablename}"`)).rows[0].n;
  return conteo;
});

const restaurar = (url, archivo) => new Promise((ok) => {
  const p = spawn(psql, ['--quiet', '--set', 'ON_ERROR_STOP=1', '--dbname', url, '--file', archivo], { stdio: ['ignore', 'ignore', 'inherit'] });
  p.on('close', ok);
});

const archivo = archivoArg ? resolve(archivoArg) : await ultimoRespaldo();
const { size, mtime } = await stat(archivo);
console.log(`Respaldo: ${archivo} (${Math.round(size / 1024)} KB, ${mtime.toLocaleString('es-CL')})`);

if (verificar) {
  const temporal = `eninti_restauracion_${Date.now()}`;
  const admin = conBase(process.env.DATABASE_URL, 'postgres');
  await conCliente(admin, (c) => c.query(`CREATE DATABASE ${temporal}`));
  const inicio = Date.now();
  try {
    if (await restaurar(conBase(process.env.DATABASE_URL, temporal), archivo) !== 0) salir('✘ La restauración falló');
    const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
    const [original, restaurada] = await Promise.all([filasPorTabla(process.env.DATABASE_URL), filasPorTabla(conBase(process.env.DATABASE_URL, temporal))]);
    const tablas = [...new Set([...Object.keys(original), ...Object.keys(restaurada)])].sort();
    let diferencias = 0;
    for (const t of tablas) {
      const igual = original[t] === restaurada[t];
      if (!igual) diferencias += 1;
      console.log(`  ${igual ? '✔' : '≠'} ${t.padEnd(26)} actual ${String(original[t] ?? '—').padStart(5)}   restaurada ${String(restaurada[t] ?? '—').padStart(5)}`);
    }
    console.log(`\nRestauración completada en ${segundos} s: ${tablas.length} tablas, ${diferencias} con diferencias.`);
    if (diferencias) console.log('Las diferencias corresponden a cambios hechos después del respaldo (revísalas si no es así).');
  } finally {
    await conCliente(admin, (c) => c.query(`DROP DATABASE IF EXISTS ${temporal} WITH (FORCE)`));
  }
} else {
  const tablas = await conCliente(destino, (c) => c.query(`SELECT count(*)::int n FROM pg_tables WHERE schemaname = 'public'`));
  if (tablas.rows[0].n > 0) salir('✘ La base de destino ya tiene tablas: por seguridad solo se restaura sobre una base vacía');
  if (await restaurar(destino, archivo) !== 0) salir('✘ La restauración falló');
  console.log('✔ Respaldo restaurado en la base de destino');
}
