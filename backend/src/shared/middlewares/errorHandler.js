import { HttpError } from '../utils/httpError.js';

// Códigos de error de PostgreSQL que corresponden a errores del cliente
const PG_ERRORS = {
  '23505': [409, 'El registro ya existe o entra en conflicto con otro'],
  '23503': [400, 'Referencia a un registro que no existe'],
  '23514': [400, 'Algún valor no cumple las reglas de la base de datos'],
  '22P02': [400, 'Formato de dato inválido'],
  '22007': [400, 'Formato de fecha inválido'],
  '22008': [400, 'Fecha fuera de rango'],
};

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, detalles: err.details });
  }
  if (PG_ERRORS[err.code]) {
    const [status, message] = PG_ERRORS[err.code];
    return res.status(status).json({ error: message, detalles: err.detail });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
