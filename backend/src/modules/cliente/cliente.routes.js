import { Router } from 'express';
import { autenticar, permitirRoles } from '../../shared/middlewares/auth.js';
import * as cliente from './cliente.controller.js';

const router = Router();

router.use(autenticar, permitirRoles('cliente'));

// Ficha técnica de mis plantas (HU-10)
router.get('/plantas', cliente.misPlantas);
router.get('/plantas/:id', cliente.obtenerPlanta);

// Mi Cuenta: pagos, deuda e historial (HU-08)
router.get('/cuenta', cliente.cuenta);

// Última y próxima mantención (HU-09)
router.get('/mantenciones', cliente.mantenciones);

// Solicitud de mantención (HU-11)
router.get('/solicitudes', cliente.misSolicitudes);
router.post('/solicitudes', cliente.crearSolicitud);

// Cancelación de la suscripción (HU-12) e inscripción del medio de pago (HU-13)
router.post('/suscripciones/:id/cancelar', cliente.cancelarSuscripcion);
router.post('/suscripciones/:id/inscripcion', cliente.iniciarInscripcion);

// Cierre de órdenes: el cliente revisa las fotos y confirma el trabajo
router.get('/ordenes/por-confirmar', cliente.ordenesPorConfirmar);
router.post('/ordenes/:id/confirmar', cliente.confirmarOrden);

// Solicitud para (volver a) tener suscripción: la otorga el administrador
router.post('/solicitudes-suscripcion', cliente.solicitarSuscripcion);

// Mis datos y solicitud de cambio de correo o teléfono
router.get('/datos', cliente.misDatos);
router.post('/datos/solicitudes', cliente.solicitarCambioDatos);

export default router;
