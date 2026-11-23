import { Router } from 'express';
import { autenticar } from '../../shared/middlewares/auth.js';
import { limitarTasa } from '../../shared/middlewares/seguridad.js';
import * as auth from './auth.controller.js';

const router = Router();

router.post('/login', auth.login);
// Ya no existe autorregistro: la cuenta del cliente la crea el administrador (HU-07)
router.get('/me', autenticar, auth.me);

// Contraseña: cambiarla con sesión iniciada, o recuperarla por correo con un enlace de un solo uso
router.post('/cambiar-contrasena', autenticar, auth.cambiarContrasena);
const limiteRecuperar = limitarTasa({ maximo: 5, ventanaMs: 15 * 60 * 1000, mensaje: 'Pediste varios enlaces seguidos. Inténtalo en 15 minutos' });
const limiteEnlace = limitarTasa({ maximo: 20, ventanaMs: 15 * 60 * 1000, mensaje: 'Demasiados intentos. Inténtalo en 15 minutos' });
router.post('/recuperar', limiteRecuperar, auth.recuperar);
router.post('/restablecer/verificar', limiteEnlace, auth.verificarEnlace);
router.post('/restablecer', limiteEnlace, auth.restablecer);

export default router;
