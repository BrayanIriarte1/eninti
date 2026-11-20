import * as solicitudes from './solicitudesCuenta.service.js';
import { parseId } from './plantas.controller.js';

export async function crear(req, res) {
  res.status(201).json(await solicitudes.crear(req.body ?? {}));
}

export async function listar(req, res) {
  res.json(await solicitudes.listar(req.query.estado));
}

export async function aprobar(req, res) {
  res.status(201).json(await solicitudes.aprobar(parseId(req.params.id), req.usuario.id, req.body ?? {}));
}

export async function rechazar(req, res) {
  res.json(await solicitudes.rechazar(parseId(req.params.id), req.usuario.id));
}
