// CAPA CONTROLADOR · traduce HTTP ⇄ función.
// Recorrido: administrador.routes.js (URL + rol) → ESTE archivo (lee req, valida ids con parseId) → catalogo.service.js (reglas + SQL).
// Aquí NO va lógica de negocio ni SQL: si te piden cambiar una regla, ve al servicio.
// req.usuario.id viene del token (middleware autenticar), nunca del navegador.
import * as catalogo from './catalogo.service.js';
import { parseId } from '../../shared/utils/ids.js';

// [CU-21] GET /api/admin/catalogo
export async function listar(_req, res) {
  res.json(await catalogo.listar());
}

// [CU-21] POST /api/admin/catalogo → 201
export async function crear(req, res) {
  res.status(201).json(await catalogo.crear(req.body ?? {}));
}

// [CU-21] PATCH /api/admin/catalogo/:id
export async function actualizar(req, res) {
  res.json(await catalogo.actualizar(parseId(req.params.id), req.body ?? {}));
}
