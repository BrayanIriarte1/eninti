// CAPA CONTROLADOR · traduce HTTP ⇄ función.
// Recorrido: administrador.routes.js (URL + rol) → ESTE archivo (lee req, valida ids con parseId) → suscripciones.service.js (reglas + SQL).
// Aquí NO va lógica de negocio ni SQL: si te piden cambiar una regla, ve al servicio.
// req.usuario.id viene del token (middleware autenticar), nunca del navegador.
import * as suscripciones from './suscripciones.service.js';
import { parseId } from './plantas.controller.js';

// [CU-14, CU-32] PATCH /api/admin/suscripciones/:id (cuota, día de cobro o estado=cancelada)
export async function actualizar(req, res) {
  res.json(await suscripciones.actualizar(parseId(req.params.id), req.body ?? {}, req.usuario.id));
}
