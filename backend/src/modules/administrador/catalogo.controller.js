import * as catalogo from './catalogo.service.js';
import { parseId } from './plantas.controller.js';

export async function listar(_req, res) {
  res.json(await catalogo.listar());
}

export async function crear(req, res) {
  res.status(201).json(await catalogo.crear(req.body ?? {}));
}

export async function actualizar(req, res) {
  res.json(await catalogo.actualizar(parseId(req.params.id), req.body ?? {}));
}
