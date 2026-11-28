// CAPA RUTAS · Campana de notificaciones (CU-37). Cualquier rol con sesión iniciada;
// cada usuario solo ve y marca las suyas (el id sale del token, nunca del navegador).
import { Router } from 'express';
import { autenticar } from '../../shared/middlewares/auth.js';
import { parseId } from '../../shared/utils/ids.js';
import * as servicio from './notificaciones.service.js';

const router = Router();
router.use(autenticar);

router.get('/', async (req, res) => res.json(await servicio.listar(req.usuario.id))); // CU-37
router.post('/leer-todas', async (req, res) => res.json(await servicio.marcarTodas(req.usuario.id))); // CU-37
router.post('/:id/leer', async (req, res) => res.json(await servicio.marcarLeida(req.usuario.id, parseId(req.params.id)))); // CU-37

export default router;
