import * as auth from './auth.service.js';
import * as contrasena from './contrasena.service.js';

export async function login(req, res) {
  const { email, password } = req.body ?? {};
  res.json(await auth.login(email, password));
}

export async function me(req, res) {
  res.json(await auth.perfil(req.usuario.id));
}

export async function cambiarContrasena(req, res) {
  res.json(await contrasena.cambiar(req.usuario.id, req.body ?? {}));
}

export async function recuperar(req, res) {
  res.json(await contrasena.solicitar(req.body?.email));
}

export async function verificarEnlace(req, res) {
  res.json(await contrasena.verificar(req.body?.token));
}

export async function restablecer(req, res) {
  res.json(await contrasena.restablecer(req.body ?? {}));
}
