import { Router } from 'express';
import * as pagos from './pagos.service.js';

const router = Router();

// Retorno de la pasarela simulada (HU-13). Sin sesión: autoriza el token de inscripción.
router.post('/simulada/confirmar', async (req, res) => {
  const { token, ...resultado } = req.body ?? {};
  res.json(await pagos.confirmarInscripcionSimulada(token, resultado));
});

export default router;
