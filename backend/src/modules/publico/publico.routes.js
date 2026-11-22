import { Router } from 'express';
import { listarPublico } from '../administrador/catalogo.service.js';
import { listarComunas } from '../administrador/clientes.service.js';
import * as solicitudesCuenta from '../administrador/solicitudesCuenta.controller.js';
import { limitarTasa } from '../../shared/middlewares/seguridad.js';

const router = Router();

// Catálogo de planes y servicios para el cotizador público, sin autenticación
router.get('/catalogo', async (_req, res) => {
  res.json(await listarPublico());
});

// Comunas donde opera ENINTI, para el formulario de solicitud de cuenta
router.get('/comunas', async (_req, res) => {
  res.json(await listarComunas());
});

// El cliente sin cuenta contacta al administrador (HU-07): no se crea ninguna
// cuenta aquí, solo una solicitud que el administrador aprueba o rechaza.
router.post(
  '/solicitudes-cuenta',
  limitarTasa({ maximo: 5, ventanaMs: 60 * 60 * 1000, mensaje: 'Recibimos varias solicitudes desde tu conexión. Inténtalo en una hora' }),
  solicitudesCuenta.crear,
);

export default router;
