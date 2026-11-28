// CAPA CONTROLADOR · traduce HTTP ⇄ función.
// Recorrido: administrador.routes.js (URL + rol) → ESTE archivo (lee req, valida ids con parseId) → solicitudesCliente.service.js (reglas + SQL).
// Aquí NO va lógica de negocio ni SQL: si te piden cambiar una regla, ve al servicio.
// req.usuario.id viene del token (middleware autenticar), nunca del navegador.
import * as servicio from './solicitudesCliente.service.js';
import { parseId } from '../../shared/utils/ids.js';

// [CU-28] GET /api/admin/solicitudes-suscripcion
export async function listarSuscripciones(req, res) {
  res.json(await servicio.listarSuscripciones(req.query.estado));
}

// [CU-28] POST /api/admin/solicitudes-suscripcion/:id/aprobar
export async function aprobarSuscripcion(req, res) {
  res.json(await servicio.aprobarSuscripcion(parseId(req.params.id), req.usuario.id, req.body ?? {}));
}

// [CU-28] POST /api/admin/solicitudes-suscripcion/:id/rechazar
export async function rechazarSuscripcion(req, res) {
  res.json(await servicio.rechazarSuscripcion(parseId(req.params.id), req.usuario.id, req.body ?? {}));
}

// [CU-29] GET /api/admin/solicitudes-datos
export async function listarCambiosDatos(req, res) {
  res.json(await servicio.listarCambiosDatos(req.query.estado));
}

// [CU-29] POST /api/admin/solicitudes-datos/:id/aprobar
export async function aprobarCambioDatos(req, res) {
  res.json(await servicio.aprobarCambioDatos(parseId(req.params.id), req.usuario.id, req.body ?? {}));
}

// [CU-29] POST /api/admin/solicitudes-datos/:id/rechazar
export async function rechazarCambioDatos(req, res) {
  res.json(await servicio.rechazarCambioDatos(parseId(req.params.id), req.usuario.id, req.body ?? {}));
}

// [CU-36] GET /api/admin/solicitudes-planta
export async function listarPlantas(req, res) {
  res.json(await servicio.listarPlantas(req.query.estado));
}

// [CU-36] POST /api/admin/solicitudes-planta/:id/aprobar (body: ficha técnica + respuesta)
export async function aprobarPlanta(req, res) {
  res.json(await servicio.aprobarPlanta(parseId(req.params.id), req.usuario.id, req.body ?? {}));
}

// [CU-36] POST /api/admin/solicitudes-planta/:id/rechazar
export async function rechazarPlanta(req, res) {
  res.json(await servicio.rechazarPlanta(parseId(req.params.id), req.usuario.id, req.body ?? {}));
}
