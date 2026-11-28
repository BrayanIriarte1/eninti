// CAPA RUTAS · declara cada URL, su método HTTP y qué middleware de seguridad aplica.
// Al final de cada línea está el caso de uso. La lógica NO va aquí: va en el controlador → servicio.
import { Router } from 'express';
import { autenticar, permitirRoles } from '../../shared/middlewares/auth.js';
import * as cliente from './cliente.controller.js';

const router = Router();

router.use(autenticar, permitirRoles('cliente'));

// Ficha técnica de mis plantas (HU-10)
router.get('/plantas', cliente.misPlantas); // CU-06
router.get('/plantas/:id', cliente.obtenerPlanta); // CU-06

// Mi Cuenta: pagos, deuda e historial (HU-08)
router.get('/cuenta', cliente.cuenta); // CU-04

// Última y próxima mantención (HU-09)
router.get('/mantenciones', cliente.mantenciones); // CU-05

// Solicitud de mantención (HU-11)
router.get('/solicitudes', cliente.misSolicitudes); // CU-07
router.post('/solicitudes', cliente.crearSolicitud); // CU-07

// Cancelación de la suscripción (HU-12) e inscripción del medio de pago (HU-13)
router.post('/suscripciones/:id/cancelar', cliente.cancelarSuscripcion); // CU-08
router.post('/suscripciones/:id/inscripcion', cliente.iniciarInscripcion); // CU-09

// Cierre de órdenes: el cliente revisa las fotos y confirma el trabajo
router.get('/ordenes/por-confirmar', cliente.ordenesPorConfirmar); // CU-23
router.post('/ordenes/:id/confirmar', cliente.confirmarOrden); // CU-23

// Solicitud para (volver a) tener suscripción: la otorga el administrador
router.post('/solicitudes-suscripcion', cliente.solicitarSuscripcion); // CU-24

// Solicitud de nueva planta: el administrador completa la ficha y la crea
router.get('/solicitudes-planta', cliente.misSolicitudesPlanta); // CU-36
router.post('/solicitudes-planta', cliente.solicitarPlanta); // CU-36

// Mis datos y solicitud de cambio de correo o teléfono
router.get('/datos', cliente.misDatos); // CU-25
router.post('/datos/solicitudes', cliente.solicitarCambioDatos); // CU-25

export default router;
