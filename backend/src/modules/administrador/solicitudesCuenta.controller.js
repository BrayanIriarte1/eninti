// CAPA CONTROLADOR · traduce HTTP ⇄ función.
// Recorrido: administrador.routes.js y publico.routes.js (URL + rol) → ESTE archivo (lee req, valida ids con parseId) → solicitudesCuenta.service.js (reglas + SQL).
// Aquí NO va lógica de negocio ni SQL: si te piden cambiar una regla, ve al servicio.
// req.usuario.id viene del token (middleware autenticar), nunca del navegador.
import * as solicitudes from './solicitudesCuenta.service.js';
import { parseId } from '../../shared/utils/ids.js';

// [CU-02] POST /api/publico/solicitudes-cuenta → 201 (sin sesión)
export async function crear(req, res) {
  res.status(201).json(await solicitudes.crear(req.body ?? {}));
}

// [CU-13] GET /api/admin/solicitudes-cuenta
export async function listar(req, res) {
  res.json(await solicitudes.listar(req.query.estado));
}

// [CU-13] POST /api/admin/solicitudes-cuenta/:id/aprobar → 201
export async function aprobar(req, res) {
  res.status(201).json(await solicitudes.aprobar(parseId(req.params.id), req.usuario.id, req.body ?? {}));
}

// [CU-13] POST /api/admin/solicitudes-cuenta/:id/rechazar
export async function rechazar(req, res) {
  res.json(await solicitudes.rechazar(parseId(req.params.id), req.usuario.id));
}
