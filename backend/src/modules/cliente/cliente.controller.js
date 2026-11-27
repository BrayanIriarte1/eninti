// CAPA CONTROLADOR · traduce HTTP ⇄ función.
// Recorrido: cliente.routes.js (URL + rol) → ESTE archivo (lee req, valida ids con parseId) → cliente.service.js (reglas + SQL).
// Aquí NO va lógica de negocio ni SQL: si te piden cambiar una regla, ve al servicio.
// req.usuario.id viene del token (middleware autenticar), nunca del navegador.
import * as cliente from './cliente.service.js';
import { HttpError } from '../../shared/utils/httpError.js';

// Convierte el :id de la URL en entero > 0; si no, responde 400.
function parseId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Id inválido');
  return id;
}

// [CU-06] GET /api/cliente/plantas
export async function misPlantas(req, res) {
  res.json(await cliente.misPlantas(req.usuario.id));
}

// [CU-06] GET /api/cliente/plantas/:id
export async function obtenerPlanta(req, res) {
  res.json(await cliente.obtenerPlanta(req.usuario.id, parseId(req.params.id)));
}

// [CU-04] GET /api/cliente/cuenta
export async function cuenta(req, res) {
  res.json(await cliente.cuenta(req.usuario.id));
}

// [CU-05] GET /api/cliente/mantenciones
export async function mantenciones(req, res) {
  res.json(await cliente.mantenciones(req.usuario.id));
}

// [CU-07] POST /api/cliente/solicitudes → 201
export async function crearSolicitud(req, res) {
  res.status(201).json(await cliente.crearSolicitud(req.usuario.id, req.body ?? {}));
}

// [CU-07] GET /api/cliente/solicitudes
export async function misSolicitudes(req, res) {
  res.json(await cliente.misSolicitudes(req.usuario.id));
}

// [CU-08] POST /api/cliente/suscripciones/:id/cancelar
export async function cancelarSuscripcion(req, res) {
  res.json(await cliente.cancelarSuscripcion(req.usuario.id, parseId(req.params.id)));
}

// [CU-09] POST /api/cliente/suscripciones/:id/inscripcion · req.ip se guarda como constancia de la aceptación
export async function iniciarInscripcion(req, res) {
  res.json(await cliente.iniciarInscripcion(req.usuario.id, parseId(req.params.id), req.body ?? {}, req.ip));
}

// [CU-23] GET /api/cliente/ordenes/por-confirmar
export async function ordenesPorConfirmar(req, res) {
  res.json(await cliente.ordenesPorConfirmar(req.usuario.id));
}

// [CU-23] POST /api/cliente/ordenes/:id/confirmar
export async function confirmarOrden(req, res) {
  res.json(await cliente.confirmarOrden(req.usuario.id, parseId(req.params.id), req.body ?? {}));
}

// [CU-24] POST /api/cliente/solicitudes-suscripcion → 201
export async function solicitarSuscripcion(req, res) {
  res.status(201).json(await cliente.solicitarSuscripcion(req.usuario.id, req.body ?? {}));
}

// [CU-25] GET /api/cliente/datos
export async function misDatos(req, res) {
  res.json(await cliente.misDatos(req.usuario.id));
}

// [CU-25] POST /api/cliente/datos/solicitudes → 201
export async function solicitarCambioDatos(req, res) {
  res.status(201).json(await cliente.solicitarCambioDatos(req.usuario.id, req.body ?? {}));
}
