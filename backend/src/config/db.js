import pg from 'pg';

// Las columnas DATE se devuelven como 'YYYY-MM-DD' y no como Date con zona horaria
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
// NUMERIC (potencia_kw) se devuelve como número
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export const query = (text, params) => pool.query(text, params);
