import pg from 'pg';

// Las columnas DATE se devuelven como 'YYYY-MM-DD' y no como Date con zona horaria
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
// NUMERIC (potencia_kw) se devuelve como número
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));

// Zona horaria del negocio: CURRENT_DATE, vencimientos y el listado mensual se calculan
// en hora de Chile aunque el servidor (Render, Neon) funcione en UTC.
export const ZONA_HORARIA = process.env.APP_TZ ?? 'America/Santiago';

// La zona horaria viaja como parámetro de inicio de cada conexión: rige desde la primera
// consulta. (Antes se hacía SET TIME ZONE en el evento 'connect' sin esperar su respuesta,
// lo que podía dejar la primera consulta en UTC y provocaba el aviso DeprecationWarning de pg.)
// Requiere la conexión directa de Neon, no la "pooled", como indica render.yaml.
const zona = ZONA_HORARIA.replace(/[^A-Za-z0-9_/+-]/g, '');
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  options: `-c TimeZone=${zona}`,
});

// Un error en una conexión inactiva (p. ej. la base suspendida) no debe botar la API
pool.on('error', (err) => console.error('PostgreSQL:', err.message));

export const query = (text, params) => pool.query(text, params);
