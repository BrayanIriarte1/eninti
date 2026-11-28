// Pruebas de integración contra PostgreSQL real (API completa + base de datos).
// Uso: npm run test:integracion   (requiere PostgreSQL local y DATABASE_URL/JWT_SECRET en .env)
//
// Cada archivo tests/integracion/*.integracion.js corre sobre su PROPIA base desechable
// (eninti_prueba_<n>): se crea, se inicializa con db:init (esquema + datos de prueba), se
// ejecuta la prueba y se borra. Nunca se toca la base de desarrollo.
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

const raiz = join(import.meta.dirname, '..');
const carpeta = join(raiz, 'tests', 'integracion');

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.error('Faltan DATABASE_URL o JWT_SECRET (en backend/.env)');
  process.exit(1);
}

// URL del servidor con otra base de datos (misma conexión, otro nombre)
const conBase = (nombre) => {
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = '/' + nombre;
  return url.toString();
};

async function administrar(sql) {
  const cliente = new pg.Client({ connectionString: conBase('postgres') });
  await cliente.connect();
  try { await cliente.query(sql); } finally { await cliente.end(); }
}

const ejecutar = (args, env) => new Promise((resolve) => {
  const proceso = spawn(process.execPath, args, { cwd: raiz, env: { ...process.env, ...env }, stdio: 'inherit' });
  proceso.on('close', resolve);
});

const filtro = process.argv[2]; // opcional: parte del nombre de un archivo
const archivos = (await readdir(carpeta)).filter((f) => f.endsWith('.integracion.js') && (!filtro || f.includes(filtro))).sort();
const resultados = [];

for (const [i, archivo] of archivos.entries()) {
  const base = `eninti_prueba_${process.pid}_${i}`;
  console.log(`\n=== ${archivo} (base ${base}) ===`);
  await administrar(`CREATE DATABASE ${base}`);
  try {
    const env = { DATABASE_URL: conBase(base), MAIL_MODE: 'consola', COBRO_AUTOMATICO: 'false' };
    const init = await ejecutar(['scripts/db-init.js'], env);
    const codigo = init === 0 ? await ejecutar(['--test', '--test-reporter=spec', join('tests', 'integracion', archivo)], env) : init;
    resultados.push([archivo, codigo]);
  } finally {
    await administrar(`DROP DATABASE IF EXISTS ${base} WITH (FORCE)`);
  }
}

console.log('\nResumen de integración:');
for (const [archivo, codigo] of resultados) console.log(`  ${codigo === 0 ? '✔' : '✘'} ${archivo}`);
process.exit(resultados.every(([, c]) => c === 0) ? 0 : 1);
