// CAPA CONTROLADOR · traduce HTTP ⇄ función.
// Recorrido: administrador.routes.js (URL + rol) → ESTE archivo (lee req, valida ids con parseId) → trabajadores.service.js (reglas + SQL).
// Aquí NO va lógica de negocio ni SQL: si te piden cambiar una regla, ve al servicio.
// req.usuario.id viene del token (middleware autenticar), nunca del navegador.
import * as trabajadores from './trabajadores.service.js';
import { parseId } from './plantas.controller.js';

// [CU-15] GET /api/admin/trabajadores
export async function listar(_req, res) {
  res.json(await trabajadores.listar());
}

// [CU-15] POST /api/admin/trabajadores → 201
export async function crear(req, res) {
  res.status(201).json(await trabajadores.crear(req.body ?? {}));
}

// [CU-15] PATCH /api/admin/trabajadores/:id (datos, clave o activo=true/false)
export async function actualizar(req, res) {
  res.json(await trabajadores.actualizar(parseId(req.params.id), req.body ?? {}, req.usuario.id));
}
