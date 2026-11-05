import { Router } from 'express';
import { autenticar, permitirRoles } from '../../shared/middlewares/auth.js';
import * as trabajador from './trabajador.controller.js';

const router = Router();

router.use(autenticar, permitirRoles('trabajador'));

// Agenda de visitas con mapa (HU-14)
router.get('/agenda', trabajador.agenda);
// Ficha técnica y estado de la orden (HU-16)
router.get('/ordenes/:id', trabajador.obtenerOrden);
// Cambio de estado y registro de la mantención ejecutada (HU-05, HU-16)
router.post('/ordenes/:id/estado', trabajador.cambiarEstado);

export default router;
