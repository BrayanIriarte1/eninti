import * as servicio from './solicitudesCliente.service.js';
import { HttpError } from '../../shared/utils/httpError.js';

function parseId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Id inválido');
  return id;
}

export async function listarSuscripciones(req, res) {
  res.json(await servicio.listarSuscripciones(req.query.estado));
}

export async function aprobarSuscripcion(req, res) {
  res.json(await servicio.aprobarSuscripcion(parseId(req.params.id), req.usuario.id, req.body ?? {}));
}

export async function rechazarSuscripcion(req, res) {
  res.json(await servicio.rechazarSuscripcion(parseId(req.params.id), req.usuario.id, req.body ?? {}));
}

export async function listarCambiosDatos(req, res) {
  res.json(await servicio.listarCambiosDatos(req.query.estado));
}

export async function aprobarCambioDatos(req, res) {
  res.json(await servicio.aprobarCambioDatos(parseId(req.params.id), req.usuario.id, req.body ?? {}));
}

export async function rechazarCambioDatos(req, res) {
  res.json(await servicio.rechazarCambioDatos(parseId(req.params.id), req.usuario.id, req.body ?? {}));
}
