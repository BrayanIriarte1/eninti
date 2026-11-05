import { Router } from 'express';
import { autenticar } from '../../shared/middlewares/auth.js';
import * as auth from './auth.controller.js';

const router = Router();

router.post('/login', auth.login);
router.post('/registro', auth.registro); // solo clientes con RUT previamente registrado (HU-07)
router.get('/me', autenticar, auth.me);

export default router;
