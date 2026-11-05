import * as mantenciones from './mantenciones.service.js';
import { parseId } from './plantas.controller.js';
import { HttpError } from '../../shared/utils/httpError.js';

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function listar(req, res) {
  const { id_comuna, desde, hasta, estado } = req.query;
  if ((desde && !FECHA_RE.test(desde)) || (hasta && !FECHA_RE.test(hasta))) {
    throw new HttpError(400, 'desde y hasta deben tener formato YYYY-MM-DD');
  }
  res.json(await mantenciones.listar({
    id_comuna: id_comuna ? parseId(id_comuna) : undefined,
    desde,
    hasta,
    estado,
  }));
}

export async function crear(req, res) {
  res.status(201).json(await mantenciones.crear(req.body ?? {}, req.usuario.id));
}

export async function asignar(req, res) {
  res.json(await mantenciones.asignar(parseId(req.params.id), req.body ?? {}));
}

export async function cancelar(req, res) {
  res.json(await mantenciones.cancelar(parseId(req.params.id), req.usuario.id, req.body?.comentario));
}

export async function listarSolicitudes(req, res) {
  res.json(await mantenciones.listarSolicitudes({ estado: req.query.estado }));
}

export async function rechazarSolicitud(req, res) {
  res.json(await mantenciones.rechazarSolicitud(parseId(req.params.id)));
}
