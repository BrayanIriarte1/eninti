import { HttpError } from './httpError.js';

// Los id de la base son INTEGER de PostgreSQL: un valor mayor no existe y, si llegara
// a la consulta, PostgreSQL respondería con un error (que terminaría en 500).
const ID_MAXIMO = 2147483647;

// Convierte el :id de la URL (o un id de filtro) en entero > 0; si no, responde 400.
export function parseId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0 || id > ID_MAXIMO) throw new HttpError(400, 'Id inválido');
  return id;
}
