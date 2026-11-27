// CAPA CONTROLADOR · traduce HTTP ⇄ función.
// Recorrido: administrador.routes.js (URL + rol) → ESTE archivo (lee req, valida ids con parseId) → plantas.service.js / suscripciones.service.js (reglas + SQL).
// Aquí NO va lógica de negocio ni SQL: si te piden cambiar una regla, ve al servicio.
// req.usuario.id viene del token (middleware autenticar), nunca del navegador.
import * as plantas from './plantas.service.js';
import * as suscripciones from './suscripciones.service.js';
import { parseId } from '../../shared/utils/ids.js';

// [CU-14] GET /api/admin/plantas (?id_cliente= &id_comuna=)
export async function listar(req, res) {
  const { id_cliente, id_comuna } = req.query;
  res.json(await plantas.listar({
    id_cliente: id_cliente ? parseId(id_cliente) : undefined,
    id_comuna: id_comuna ? parseId(id_comuna) : undefined,
  }));
}

// [CU-14] GET /api/admin/plantas/:id
export async function obtener(req, res) {
  res.json(await plantas.obtener(parseId(req.params.id)));
}

// [CU-14] POST /api/admin/plantas → 201
export async function crear(req, res) {
  res.status(201).json(await plantas.crear(req.body ?? {}));
}

// [CU-14] PUT /api/admin/plantas/:id
export async function actualizar(req, res) {
  res.json(await plantas.actualizar(parseId(req.params.id), req.body ?? {}));
}

// [CU-14] GET /api/admin/plantas/:id/suscripciones
export async function listarSuscripciones(req, res) {
  res.json(await suscripciones.listarPorPlanta(parseId(req.params.id)));
}

// [CU-14] POST /api/admin/plantas/:id/suscripciones → 201
export async function crearSuscripcion(req, res) {
  res.status(201).json(await suscripciones.crear(parseId(req.params.id), req.body ?? {}));
}
