// CAPA CONTROLADOR · traduce HTTP ⇄ función.
// Recorrido: administrador.routes.js (URL + rol) → ESTE archivo (lee req, valida ids con parseId) → mantenciones.service.js (reglas + SQL).
// Aquí NO va lógica de negocio ni SQL: si te piden cambiar una regla, ve al servicio.
// req.usuario.id viene del token (middleware autenticar), nunca del navegador.
import * as mantenciones from './mantenciones.service.js';
import { parseId } from './plantas.controller.js';
import { HttpError } from '../../shared/utils/httpError.js';

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

// [CU-16] GET /api/admin/mantenciones (?id_comuna= &desde= &hasta= &estado=). Filtro nuevo: léelo aquí de req.query.
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

// [CU-16, CU-17] POST /api/admin/mantenciones → 201
export async function crear(req, res) {
  res.status(201).json(await mantenciones.crear(req.body ?? {}, req.usuario.id));
}

// [CU-16] PATCH /api/admin/mantenciones/:id/asignar
export async function asignar(req, res) {
  res.json(await mantenciones.asignar(parseId(req.params.id), req.body ?? {}));
}

// [CU-30] POST /api/admin/mantenciones/:id/cancelar
export async function cancelar(req, res) {
  res.json(await mantenciones.cancelar(parseId(req.params.id), req.usuario.id, req.body?.comentario));
}

// [CU-17] GET /api/admin/solicitudes
export async function listarSolicitudes(req, res) {
  res.json(await mantenciones.listarSolicitudes({ estado: req.query.estado }));
}

// [CU-17] POST /api/admin/solicitudes/:id/rechazar
export async function rechazarSolicitud(req, res) {
  res.json(await mantenciones.rechazarSolicitud(parseId(req.params.id)));
}

// [CU-31] GET /api/admin/mantenciones/:id/fotos
export async function fotos(req, res) {
  res.json(await mantenciones.fotos(parseId(req.params.id)));
}

// [CU-31] POST /api/admin/mantenciones/:id/cerrar
export async function cerrarSinCliente(req, res) {
  res.json(await mantenciones.cerrarSinCliente(parseId(req.params.id), req.usuario.id, req.body?.comentario));
}
