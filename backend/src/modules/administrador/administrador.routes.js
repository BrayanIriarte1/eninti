// CAPA RUTAS · declara cada URL, su método HTTP y qué middleware de seguridad aplica.
// Al final de cada línea está el caso de uso. La lógica NO va aquí: va en el controlador → servicio.
import { Router } from 'express';
import { autenticar, permitirRoles } from '../../shared/middlewares/auth.js';
import * as clientes from './clientes.controller.js';
import * as plantas from './plantas.controller.js';
import * as suscripciones from './suscripciones.controller.js';
import * as trabajadores from './trabajadores.controller.js';
import * as mantenciones from './mantenciones.controller.js';
import * as finanzas from './finanzas.controller.js';
import * as catalogo from './catalogo.controller.js';
import * as solicitudesCuenta from './solicitudesCuenta.controller.js';
import * as solicitudesCliente from './solicitudesCliente.controller.js';
import * as correo from '../notificaciones/correo.controller.js';

const router = Router();

router.use(autenticar, permitirRoles('administrador'));

// Clientes (HU-03)
router.get('/clientes', clientes.listar); // CU-14
router.post('/clientes', clientes.crear); // CU-14
router.put('/clientes/:id', clientes.actualizar); // CU-14
router.post('/clientes/:id/cuenta', clientes.crearCuenta); // cuenta web creada por el administrador (HU-07)
router.get('/comunas', clientes.listarComunas);

// Solicitudes de cuenta enviadas desde el login (HU-07)
router.get('/solicitudes-cuenta', solicitudesCuenta.listar); // CU-13
router.post('/solicitudes-cuenta/:id/aprobar', solicitudesCuenta.aprobar); // CU-13
router.post('/solicitudes-cuenta/:id/rechazar', solicitudesCuenta.rechazar); // CU-13

// Solicitudes de suscripción: solo el administrador otorga suscripciones
router.get('/solicitudes-suscripcion', solicitudesCliente.listarSuscripciones); // CU-28
router.post('/solicitudes-suscripcion/:id/aprobar', solicitudesCliente.aprobarSuscripcion); // CU-28
router.post('/solicitudes-suscripcion/:id/rechazar', solicitudesCliente.rechazarSuscripcion); // CU-28

// Solicitudes de cambio de correo o teléfono de los clientes
router.get('/solicitudes-datos', solicitudesCliente.listarCambiosDatos); // CU-29
router.post('/solicitudes-datos/:id/aprobar', solicitudesCliente.aprobarCambioDatos); // CU-29
router.post('/solicitudes-datos/:id/rechazar', solicitudesCliente.rechazarCambioDatos); // CU-29

// Plantas y ficha técnica (HU-03)
router.get('/plantas', plantas.listar); // CU-14
router.post('/plantas', plantas.crear); // CU-14
router.get('/plantas/:id', plantas.obtener); // CU-14
router.put('/plantas/:id', plantas.actualizar); // CU-14

// Suscripciones asociadas a una planta (HU-03)
router.get('/plantas/:id/suscripciones', plantas.listarSuscripciones); // CU-14
router.post('/plantas/:id/suscripciones', plantas.crearSuscripcion); // CU-14
router.patch('/suscripciones/:id', suscripciones.actualizar); // CU-14, CU-32

// Cuentas de trabajadores (HU-15)
router.get('/trabajadores', trabajadores.listar); // CU-15
router.post('/trabajadores', trabajadores.crear); // CU-15
router.patch('/trabajadores/:id', trabajadores.actualizar); // CU-15

// Calendario por comuna, programación y asignación (HU-04, HU-17)
router.get('/mantenciones', mantenciones.listar); // CU-16
router.post('/mantenciones', mantenciones.crear); // CU-16, CU-17
router.patch('/mantenciones/:id/asignar', mantenciones.asignar); // CU-16
router.post('/mantenciones/:id/cancelar', mantenciones.cancelar); // CU-30
router.get('/mantenciones/:id/fotos', mantenciones.fotos); // CU-31
router.post('/mantenciones/:id/cerrar', mantenciones.cerrarSinCliente); // sin confirmación del cliente // CU-31

// Bandeja de solicitudes del cliente (HU-11)
router.get('/solicitudes', mantenciones.listarSolicitudes); // CU-17
router.post('/solicitudes/:id/rechazar', mantenciones.rechazarSolicitud); // CU-17

// Finanzas: impagos, pagos manuales, listado mensual y motor de cuotas (HU-01, HU-02, HU-06)
router.get('/finanzas/impagos', finanzas.impagos); // CU-18
router.get('/finanzas/pagos', finanzas.pagosDelMes); // CU-19
router.get('/suscripciones/:id/cuotas', finanzas.cuotasDeSuscripcion); // CU-22
router.post('/cuotas/:id/pagos', finanzas.registrarPagoManual); // CU-22
router.post('/finanzas/generar-cuotas', finanzas.generarCuotas); // CU-20
router.post('/finanzas/procesar-cargos', finanzas.procesarCargos); // CU-20
router.get('/finanzas/cobro-automatico', finanzas.estadoCobroAutomatico); // CU-34
router.post('/finanzas/cobro-automatico/ejecutar', finanzas.ejecutarCobroAutomatico); // CU-34
router.post('/finanzas/intentos/:id/descartar', finanzas.descartarIntento); // CU-34

// Correo: estado de la configuración, bitácora de avisos y correo de prueba
router.get('/correo', correo.estado); // CU-33
router.post('/correo/prueba', correo.prueba); // CU-33

// Catálogo de planes y servicios (RNF-07)
router.get('/catalogo', catalogo.listar); // CU-21
router.post('/catalogo', catalogo.crear); // CU-21
router.patch('/catalogo/:id', catalogo.actualizar); // CU-21

export default router;
