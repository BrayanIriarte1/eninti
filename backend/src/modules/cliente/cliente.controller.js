import * as cliente from './cliente.service.js';
import { HttpError } from '../../shared/utils/httpError.js';

function parseId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Id inválido');
  return id;
}

export async function misPlantas(req, res) {
  res.json(await cliente.misPlantas(req.usuario.id));
}

export async function obtenerPlanta(req, res) {
  res.json(await cliente.obtenerPlanta(req.usuario.id, parseId(req.params.id)));
}

export async function cuenta(req, res) {
  res.json(await cliente.cuenta(req.usuario.id));
}

export async function mantenciones(req, res) {
  res.json(await cliente.mantenciones(req.usuario.id));
}

export async function crearSolicitud(req, res) {
  res.status(201).json(await cliente.crearSolicitud(req.usuario.id, req.body ?? {}));
}

export async function misSolicitudes(req, res) {
  res.json(await cliente.misSolicitudes(req.usuario.id));
}

export async function cancelarSuscripcion(req, res) {
  res.json(await cliente.cancelarSuscripcion(req.usuario.id, parseId(req.params.id)));
}

export async function iniciarInscripcion(req, res) {
  res.json(await cliente.iniciarInscripcion(req.usuario.id, parseId(req.params.id), req.body ?? {}, req.ip));
}
