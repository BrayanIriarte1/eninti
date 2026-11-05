import { Router } from 'express';
import { autenticar, permitirRoles } from '../../shared/middlewares/auth.js';
import * as clientes from './clientes.controller.js';
import * as plantas from './plantas.controller.js';
import * as suscripciones from './suscripciones.controller.js';
import * as trabajadores from './trabajadores.controller.js';
import * as mantenciones from './mantenciones.controller.js';
import * as finanzas from './finanzas.controller.js';
import * as catalogo from './catalogo.controller.js';

const router = Router();

router.use(autenticar, permitirRoles('administrador'));

// Clientes (HU-03)
router.get('/clientes', clientes.listar);
router.post('/clientes', clientes.crear);
router.put('/clientes/:id', clientes.actualizar);
router.get('/comunas', clientes.listarComunas);

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
