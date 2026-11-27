// CAPA RUTAS · declara cada URL, su método HTTP y qué middleware de seguridad aplica.
// Al final de cada línea está el caso de uso. La lógica NO va aquí: va en el controlador → servicio.
import { Router } from 'express';
import { autenticar } from '../../shared/middlewares/auth.js';
import { limitarTasa } from '../../shared/middlewares/seguridad.js';
import * as auth from './auth.controller.js';

const router = Router();

router.post('/login', auth.login); // CU-03
// Ya no existe autorregistro: la cuenta del cliente la crea el administrador (HU-07)
router.get('/me', autenticar, auth.me); // CU-03

// Contraseña: cambiarla con sesión iniciada, o recuperarla por correo con un enlace de un solo uso
router.post('/cambiar-contrasena', autenticar, auth.cambiarContrasena); // CU-26
const limiteRecuperar = limitarTasa({ maximo: 5, ventanaMs: 15 * 60 * 1000, mensaje: 'Pediste varios enlaces seguidos. Inténtalo en 15 minutos' });
const limiteEnlace = limitarTasa({ maximo: 20, ventanaMs: 15 * 60 * 1000, mensaje: 'Demasiados intentos. Inténtalo en 15 minutos' });
router.post('/recuperar', limiteRecuperar, auth.recuperar); // CU-27
router.post('/restablecer/verificar', limiteEnlace, auth.verificarEnlace); // CU-27
router.post('/restablecer', limiteEnlace, auth.restablecer); // CU-27

export default router;
