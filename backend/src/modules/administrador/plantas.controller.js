import * as plantas from './plantas.service.js';
import * as suscripciones from './suscripciones.service.js';
import { HttpError } from '../../shared/utils/httpError.js';

export function parseId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Id inválido');
  return id;
}

export async function listar(req, res) {
  const { id_cliente, id_comuna } = req.query;
  res.json(await plantas.listar({
    id_cliente: id_cliente ? parseId(id_cliente) : undefined,
    id_comuna: id_comuna ? parseId(id_comuna) : undefined,
  }));
}

export async function obtener(req, res) {
  res.json(await plantas.obtener(parseId(req.params.id)));
}

export async function crear(req, res) {
  res.status(201).json(await plantas.crear(req.body ?? {}));
}

export async function actualizar(req, res) {
  res.json(await plantas.actualizar(parseId(req.params.id), req.body ?? {}));
}

export async function listarSuscripciones(req, res) {
  res.json(await suscripciones.listarPorPlanta(parseId(req.params.id)));
}

export async function crearSuscripcion(req, res) {
  res.status(201).json(await suscripciones.crear(parseId(req.params.id), req.body ?? {}));
}
