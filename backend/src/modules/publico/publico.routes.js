import { Router } from 'express';
import { listarPublico } from '../administrador/catalogo.service.js';

const router = Router();

// Catálogo de planes y servicios para el cotizador público, sin autenticación
router.get('/catalogo', async (_req, res) => {
  res.json(await listarPublico());
});

export default router;
