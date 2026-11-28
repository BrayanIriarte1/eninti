// Ubica los programas de PostgreSQL (pg_dump, psql) aunque no estén en el PATH.
// Orden: variable PG_BIN → PATH → instalación estándar de Windows (la versión más nueva).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function herramientaPg(nombre) {
  const exe = process.platform === 'win32' ? `${nombre}.exe` : nombre;
  if (process.env.PG_BIN && existsSync(join(process.env.PG_BIN, exe))) return join(process.env.PG_BIN, exe);
  if (spawnSync(nombre, ['--version']).status === 0) return nombre;
  const base = 'C:/Program Files/PostgreSQL';
  if (process.platform === 'win32' && existsSync(base)) {
    const versiones = readdirSync(base).filter((v) => /^\d+$/.test(v)).sort((a, b) => b - a);
    for (const v of versiones) {
      const ruta = join(base, v, 'bin', exe);
      if (existsSync(ruta)) return ruta;
    }
  }
  return null;
}
