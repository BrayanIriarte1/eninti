import { Router } from 'express';
import { listarPublico } from '../administrador/catalogo.service.js';
import { listarComunas } from '../administrador/clientes.service.js';
import * as solicitudesCuenta from '../administrador/solicitudesCuenta.controller.js';
import { limitarPorIp } from '../../shared/middlewares/limite.js';

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
// Ruta sin login: máximo 5 solicitudes por hora desde una misma IP.
const limiteSolicitudes = limitarPorIp({
  maximo: 5,
  ventanaMs: 60 * 60 * 1000,
  mensaje: 'Recibimos varias solicitudes desde tu conexión. Inténtalo de nuevo en una hora o escríbenos por WhatsApp',
});
router.post('/solicitudes-cuenta', limiteSolicitudes, solicitudesCuenta.crear);

export default router;
