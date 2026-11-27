// CAPA CONTROLADOR · traduce HTTP ⇄ función.
// Recorrido: auth.routes.js (URL + rol) → ESTE archivo (lee req, valida ids con parseId) → auth.service.js / contrasena.service.js (reglas + SQL).
// Aquí NO va lógica de negocio ni SQL: si te piden cambiar una regla, ve al servicio.
// req.usuario.id viene del token (middleware autenticar), nunca del navegador.
import * as auth from './auth.service.js';
import * as contrasena from './contrasena.service.js';

// [CU-03] POST /api/auth/login
export async function login(req, res) {
  const { email, password } = req.body ?? {};
  res.json(await auth.login(email, password));
}

// [CU-03] GET /api/auth/me · perfil del usuario del token (lo usa AuthContext al recargar)
export async function me(req, res) {
  res.json(await auth.perfil(req.usuario.id));
}

// [CU-26] POST /api/auth/cambiar-contrasena
export async function cambiarContrasena(req, res) {
  res.json(await contrasena.cambiar(req.usuario.id, req.body ?? {}));
}

// [CU-27] POST /api/auth/recuperar
export async function recuperar(req, res) {
  res.json(await contrasena.solicitar(req.body?.email));
}

// [CU-27] POST /api/auth/restablecer/verificar
export async function verificarEnlace(req, res) {
  res.json(await contrasena.verificar(req.body?.token));
}

// [CU-27] POST /api/auth/restablecer
export async function restablecer(req, res) {
  res.json(await contrasena.restablecer(req.body ?? {}));
}
