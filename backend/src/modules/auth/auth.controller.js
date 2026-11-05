import * as auth from './auth.service.js';

export async function login(req, res) {
  const { email, password } = req.body ?? {};
  res.json(await auth.login(email, password));
}

export async function registro(req, res) {
  res.status(201).json(await auth.registrarCliente(req.body ?? {}));
}

export async function me(req, res) {
  res.json(await auth.perfil(req.usuario.id));
}
