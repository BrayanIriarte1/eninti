// CAPA RUTAS · declara cada URL, su método HTTP y qué middleware de seguridad aplica.
// Al final de cada línea está el caso de uso. La lógica NO va aquí: va en el controlador → servicio.
import { Router } from 'express';
import { autenticar, permitirRoles } from '../../shared/middlewares/auth.js';
import * as trabajador from './trabajador.controller.js';

const router = Router();

router.use(autenticar, permitirRoles('trabajador'));

// Agenda de visitas con mapa (HU-14)
router.get('/agenda', trabajador.agenda); // CU-10
// Ficha técnica y estado de la orden (HU-16)
router.get('/ordenes/:id', trabajador.obtenerOrden); // CU-11
// Cambio de estado y registro de la mantención ejecutada (HU-05, HU-16)
router.post('/ordenes/:id/estado', trabajador.cambiarEstado); // CU-11, CU-12

export default router;
