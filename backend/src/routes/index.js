import { Router } from 'express';
import administrador from '../modules/administrador/administrador.routes.js';
import auth from '../modules/auth/auth.routes.js';
import cliente from '../modules/cliente/cliente.routes.js';
import trabajador from '../modules/trabajador/trabajador.routes.js';
import pagos from '../modules/pagos/pagos.routes.js';
import publico from '../modules/publico/publico.routes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true }));
router.use('/auth', auth);
router.use('/publico', publico);
router.use('/cliente', cliente);
router.use('/trabajador', trabajador);
router.use('/admin', administrador);
router.use('/pagos', pagos);

export default router;
