// CAPA CONTROLADOR · traduce HTTP ⇄ función.
// Recorrido: administrador.routes.js (URL + rol) → ESTE archivo (lee req, valida ids con parseId) → clientes.service.js (reglas + SQL).
// Aquí NO va lógica de negocio ni SQL: si te piden cambiar una regla, ve al servicio.
// req.usuario.id viene del token (middleware autenticar), nunca del navegador.
import * as clientes from './clientes.service.js';
import { parseId } from './plantas.controller.js';

// [CU-14] GET /api/admin/clientes
export async function listar(_req, res) {
  res.json(await clientes.listar());
}

// GET /api/admin/comunas (selectores de los formularios)
export async function listarComunas(_req, res) {
  res.json(await clientes.listarComunas());
}

// [CU-14] POST /api/admin/clientes → 201
export async function crear(req, res) {
  res.status(201).json(await clientes.crear(req.body ?? {}));
}

// [CU-14] PUT /api/admin/clientes/:id
export async function actualizar(req, res) {
  res.json(await clientes.actualizar(parseId(req.params.id), req.body ?? {}));
}

// [CU-13/HU-07] POST /api/admin/clientes/:id/cuenta → 201
export async function crearCuenta(req, res) {
  res.status(201).json(await clientes.crearCuenta(parseId(req.params.id), req.body ?? {}));
}
