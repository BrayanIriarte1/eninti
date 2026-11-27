import pg from 'pg';

// Las columnas DATE se devuelven como 'YYYY-MM-DD' y no como Date con zona horaria
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
// NUMERIC (potencia_kw) se devuelve como número
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));

// Cada conexión trabaja en hora de Chile, aunque el servidor esté en UTC (Render):
// así CURRENT_DATE, los vencimientos y el listado mensual de pagos (HU-06) usan el día chileno.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  options: '-c timezone=America/Santiago',
});

export const query = (text, params) => pool.query(text, params);
