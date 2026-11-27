// CAPA CONTROLADOR · traduce HTTP ⇄ función.
// Recorrido: trabajador.routes.js (URL + rol) → ESTE archivo (lee req, valida ids con parseId) → trabajador.service.js (reglas + SQL).
// Aquí NO va lógica de negocio ni SQL: si te piden cambiar una regla, ve al servicio.
// req.usuario.id viene del token (middleware autenticar), nunca del navegador.
import * as trabajador from './trabajador.service.js';
import { HttpError } from '../../shared/utils/httpError.js';

// Convierte el :id de la URL en entero > 0; si no, responde 400.
export function parseId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Id inválido');
  return id;
}

// [CU-10] GET /api/trabajador/agenda (?historicas=true para las cerradas)
export async function agenda(req, res) {
  res.json(await trabajador.agenda(req.usuario.id, { historicas: req.query.historicas === 'true' }));
}

// [CU-11] GET /api/trabajador/ordenes/:id
export async function obtenerOrden(req, res) {
  res.json(await trabajador.obtenerOrden(parseId(req.params.id), req.usuario.id));
}

// [CU-11, CU-12] POST /api/trabajador/ordenes/:id/estado
export async function cambiarEstado(req, res) {
  res.json(await trabajador.cambiarEstado(parseId(req.params.id), req.usuario.id, req.body ?? {}));
}
