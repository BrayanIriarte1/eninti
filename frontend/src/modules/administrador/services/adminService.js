// Llamadas del administrador a /api/admin/... · Backend: administrador.routes.js
import { api } from '../../../shared/utils/api.js';

// Clientes (HU-03)
export const listarClientes = () => api('/admin/clientes');
export const crearCliente = (datos) => api('/admin/clientes', { method: 'POST', body: datos });
export const actualizarCliente = (id, datos) => api(`/admin/clientes/${id}`, { method: 'PUT', body: datos });
export const listarComunas = () => api('/admin/comunas');
export const crearCuentaCliente = (id, datos) => api(`/admin/clientes/${id}/cuenta`, { method: 'POST', body: datos });

// Solicitudes de cuenta enviadas desde el login (HU-07)
export const listarSolicitudesCuenta = (estado) => api(`/admin/solicitudes-cuenta${estado ? `?estado=${estado}` : ''}`);
export const aprobarSolicitudCuenta = (id, datos) => api(`/admin/solicitudes-cuenta/${id}/aprobar`, { method: 'POST', body: datos });
export const rechazarSolicitudCuenta = (id) => api(`/admin/solicitudes-cuenta/${id}/rechazar`, { method: 'POST' });

// Trabajadores (HU-15)
export const listarTrabajadores = () => api('/admin/trabajadores');
export const crearTrabajador = (datos) => api('/admin/trabajadores', { method: 'POST', body: datos });
export const actualizarTrabajador = (id, datos) => api(`/admin/trabajadores/${id}`, { method: 'PATCH', body: datos });

// Calendario, programación y asignación (HU-04, HU-17)
export const listarMantenciones = (params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return api(`/admin/mantenciones${qs ? `?${qs}` : ''}`);
};
export const crearMantencion = (datos) => api('/admin/mantenciones', { method: 'POST', body: datos });
export const asignarMantencion = (id, id_trabajador) =>
  api(`/admin/mantenciones/${id}/asignar`, { method: 'PATCH', body: { id_trabajador } });
export const cancelarMantencion = (id, comentario) =>
  api(`/admin/mantenciones/${id}/cancelar`, { method: 'POST', body: { comentario } });

// Solicitudes (HU-11)
export const listarSolicitudes = (estado) => api(`/admin/solicitudes${estado ? `?estado=${estado}` : ''}`);
export const rechazarSolicitud = (id) => api(`/admin/solicitudes/${id}/rechazar`, { method: 'POST' });

// Finanzas (HU-01, HU-02, HU-06)
export const listarImpagos = () => api('/admin/finanzas/impagos');
export const cuotasDeSuscripcion = (id) => api(`/admin/suscripciones/${id}/cuotas`);
export const registrarPagoManual = (idCuota, datos) => api(`/admin/cuotas/${idCuota}/pagos`, { method: 'POST', body: datos });
export const pagosDelMes = (periodo) => api(`/admin/finanzas/pagos?periodo=${periodo}`);
export const generarCuotas = (periodo) => api('/admin/finanzas/generar-cuotas', { method: 'POST', body: { periodo } });
export const procesarCargos = () => api('/admin/finanzas/procesar-cargos', { method: 'POST' });

// Catálogo (RNF-07)
export const listarCatalogo = () => api('/admin/catalogo');
export const crearServicio = (datos) => api('/admin/catalogo', { method: 'POST', body: datos });
export const actualizarServicio = (id, datos) => api(`/admin/catalogo/${id}`, { method: 'PATCH', body: datos });

// Cierre de órdenes: fotos y cierre sin confirmación del cliente
export const fotosMantencion = (id) => api(`/admin/mantenciones/${id}/fotos`);
export const cerrarSinCliente = (id, comentario) =>
  api(`/admin/mantenciones/${id}/cerrar`, { method: 'POST', body: { comentario } });

// Solicitudes de suscripción
export const listarSolicitudesSuscripcion = (estado) => api(`/admin/solicitudes-suscripcion${estado ? `?estado=${estado}` : ''}`);
export const aprobarSolicitudSuscripcion = (id, datos) => api(`/admin/solicitudes-suscripcion/${id}/aprobar`, { method: 'POST', body: datos });
export const rechazarSolicitudSuscripcion = (id, respuesta) =>
  api(`/admin/solicitudes-suscripcion/${id}/rechazar`, { method: 'POST', body: { respuesta } });

// Solicitudes de cambio de datos del cliente
export const listarCambiosDatos = (estado) => api(`/admin/solicitudes-datos${estado ? `?estado=${estado}` : ''}`);
export const aprobarCambioDatos = (id, respuesta) => api(`/admin/solicitudes-datos/${id}/aprobar`, { method: 'POST', body: { respuesta } });
export const rechazarCambioDatos = (id, respuesta) => api(`/admin/solicitudes-datos/${id}/rechazar`, { method: 'POST', body: { respuesta } });
// Cobro mensual automático: estado, ejecución inmediata y cobros en espera de la pasarela
export const estadoCobroAutomatico = () => api('/admin/finanzas/cobro-automatico');
export const ejecutarCobroAutomatico = () => api('/admin/finanzas/cobro-automatico/ejecutar', { method: 'POST' });
export const descartarIntento = (id) => api(`/admin/finanzas/intentos/${id}/descartar`, { method: 'POST' });
// Correo: estado, bitácora y envío de prueba
export const estadoCorreo = () => api('/admin/correo');
export const enviarCorreoPrueba = (para) => api('/admin/correo/prueba', { method: 'POST', body: para ? { para } : {} });
