import { api } from '../../../shared/utils/api.js';

// Clientes (HU-03)
export const listarClientes = () => api('/admin/clientes');
export const crearCliente = (datos) => api('/admin/clientes', { method: 'POST', body: datos });
export const actualizarCliente = (id, datos) => api(`/admin/clientes/${id}`, { method: 'PUT', body: datos });
export const listarComunas = () => api('/admin/comunas');

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
