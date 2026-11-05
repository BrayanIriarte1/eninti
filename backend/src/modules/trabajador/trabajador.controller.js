import * as trabajador from './trabajador.service.js';
import { HttpError } from '../../shared/utils/httpError.js';

export function parseId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Id inválido');
  return id;
}

export async function agenda(req, res) {
  res.json(await trabajador.agenda(req.usuario.id, { historicas: req.query.historicas === 'true' }));
}

export async function obtenerOrden(req, res) {
  res.json(await trabajador.obtenerOrden(parseId(req.params.id), req.usuario.id));
}

export async function cambiarEstado(req, res) {
  res.json(await trabajador.cambiarEstado(parseId(req.params.id), req.usuario.id, req.body ?? {}));
}
