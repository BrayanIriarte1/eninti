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

const router = Router();

router.use(autenticar, permitirRoles('administrador'));

// Clientes (HU-03)
router.get('/clientes', clientes.listar);
router.post('/clientes', clientes.crear);
router.put('/clientes/:id', clientes.actualizar);
router.post('/clientes/:id/cuenta', clientes.crearCuenta); // cuenta web creada por el administrador (HU-07)
router.get('/comunas', clientes.listarComunas);

// Solicitudes de cuenta enviadas desde el login (HU-07)
router.get('/solicitudes-cuenta', solicitudesCuenta.listar);
router.post('/solicitudes-cuenta/:id/aprobar', solicitudesCuenta.aprobar);
router.post('/solicitudes-cuenta/:id/rechazar', solicitudesCuenta.rechazar);

// Solicitudes de suscripción: solo el administrador otorga suscripciones
router.get('/solicitudes-suscripcion', solicitudesCliente.listarSuscripciones);
router.post('/solicitudes-suscripcion/:id/aprobar', solicitudesCliente.aprobarSuscripcion);
router.post('/solicitudes-suscripcion/:id/rechazar', solicitudesCliente.rechazarSuscripcion);

// Solicitudes de cambio de correo o teléfono de los clientes
router.get('/solicitudes-datos', solicitudesCliente.listarCambiosDatos);
router.post('/solicitudes-datos/:id/aprobar', solicitudesCliente.aprobarCambioDatos);
router.post('/solicitudes-datos/:id/rechazar', solicitudesCliente.rechazarCambioDatos);

// Plantas y ficha técnica (HU-03)
router.get('/plantas', plantas.listar);
router.post('/plantas', plantas.crear);
router.get('/plantas/:id', plantas.obtener);
router.put('/plantas/:id', plantas.actualizar);

// Suscripciones asociadas a una planta (HU-03)
router.get('/plantas/:id/suscripciones', plantas.listarSuscripciones);
router.post('/plantas/:id/suscripciones', plantas.crearSuscripcion);
router.patch('/suscripciones/:id', suscripciones.actualizar);

// Cuentas de trabajadores (HU-15)
router.get('/trabajadores', trabajadores.listar);
router.post('/trabajadores', trabajadores.crear);
router.patch('/trabajadores/:id', trabajadores.actualizar);

// Calendario por comuna, programación y asignación (HU-04, HU-17)
router.get('/mantenciones', mantenciones.listar);
router.post('/mantenciones', mantenciones.crear);
router.patch('/mantenciones/:id/asignar', mantenciones.asignar);
router.post('/mantenciones/:id/cancelar', mantenciones.cancelar);
router.get('/mantenciones/:id/fotos', mantenciones.fotos);
router.post('/mantenciones/:id/cerrar', mantenciones.cerrarSinCliente); // sin confirmación del cliente

// Bandeja de solicitudes del cliente (HU-11)
router.get('/solicitudes', mantenciones.listarSolicitudes);
router.post('/solicitudes/:id/rechazar', mantenciones.rechazarSolicitud);

// Finanzas: impagos, pagos manuales, listado mensual y motor de cuotas (HU-01, HU-02, HU-06)
router.get('/finanzas/impagos', finanzas.impagos);
router.get('/finanzas/pagos', finanzas.pagosDelMes);
router.get('/suscripciones/:id/cuotas', finanzas.cuotasDeSuscripcion);
router.post('/cuotas/:id/pagos', finanzas.registrarPagoManual);
router.post('/finanzas/generar-cuotas', finanzas.generarCuotas);
router.post('/finanzas/procesar-cargos', finanzas.procesarCargos);

// Catálogo de planes y servicios (RNF-07)
router.get('/catalogo', catalogo.listar);
router.post('/catalogo', catalogo.crear);
router.patch('/catalogo/:id', catalogo.actualizar);

export default router;
