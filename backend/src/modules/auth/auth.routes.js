import { Router } from 'express';
import { autenticar } from '../../shared/middlewares/auth.js';
import * as auth from './auth.controller.js';

const router = Router();

router.post('/login', auth.login);
// Ya no existe autorregistro: la cuenta del cliente la crea el administrador (HU-07)
router.get('/me', autenticar, auth.me);

export default router;
