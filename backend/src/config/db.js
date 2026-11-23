import pg from 'pg';

// Las columnas DATE se devuelven como 'YYYY-MM-DD' y no como Date con zona horaria
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
// NUMERIC (potencia_kw) se devuelve como número
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));

// Zona horaria del negocio: CURRENT_DATE, vencimientos y el listado mensual se calculan
// en hora de Chile aunque el servidor (Render, Neon) funcione en UTC.
export const ZONA_HORARIA = process.env.APP_TZ ?? 'America/Santiago';

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

pool.on('connect', (cliente) => {
  cliente.query(`SET TIME ZONE '${ZONA_HORARIA.replace(/'/g, '')}'`).catch(() => {});
});

// Un error en una conexión inactiva (p. ej. la base suspendida) no debe botar la API
pool.on('error', (err) => console.error('PostgreSQL:', err.message));

export const query = (text, params) => pool.query(text, params);
