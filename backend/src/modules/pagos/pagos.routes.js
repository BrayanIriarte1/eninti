import express, { Router } from 'express';
import * as pagos from './pagos.service.js';

const router = Router();

// Retorno de la pasarela simulada (HU-13). Sin sesión: autoriza el token de inscripción.
router.post('/simulada/confirmar', async (req, res) => {
  const { token, ...resultado } = req.body ?? {};
  res.json(await pagos.confirmarInscripcionSimulada(token, resultado));
});

// Retorno de Flow sandbox (HU-13). Flow redirige el navegador del cliente con un POST
// (formulario con el parámetro token). Se verifica el estado con Flow y se vuelve a Mi cuenta.
async function retornoFlow(req, res) {
  const token = req.body?.token ?? req.query?.token;
  const app = process.env.APP_URL ?? '';
  try {
    const medio = await pagos.confirmarInscripcionFlow(token);
    res.redirect(303, `${app}/cliente/cuenta?inscripcion=${medio.estado === 'activo' ? 'aprobada' : 'rechazada'}`);
  } catch (err) {
    console.error('Retorno de Flow:', err.message, err.details ?? '');
    res.redirect(303, `${app}/cliente/cuenta?inscripcion=error`);
  }
}
router.post('/flow/retorno', express.urlencoded({ extended: false, limit: '10kb' }), retornoFlow);
router.get('/flow/retorno', retornoFlow);

export default router;
