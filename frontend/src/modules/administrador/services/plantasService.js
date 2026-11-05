import { api } from '../../../shared/utils/api.js';

export const listarPlantas = () => api('/admin/plantas');
export const obtenerPlanta = (id) => api(`/admin/plantas/${id}`);
export const crearPlanta = (datos) => api('/admin/plantas', { method: 'POST', body: datos });
export const actualizarPlanta = (id, datos) => api(`/admin/plantas/${id}`, { method: 'PUT', body: datos });

export const listarSuscripciones = (plantaId) => api(`/admin/plantas/${plantaId}/suscripciones`);
export const crearSuscripcion = (plantaId, datos) =>
  api(`/admin/plantas/${plantaId}/suscripciones`, { method: 'POST', body: datos });
export const actualizarSuscripcion = (id, datos) =>
  api(`/admin/suscripciones/${id}`, { method: 'PATCH', body: datos });

export const listarClientes = () => api('/admin/clientes');
export const listarComunas = () => api('/admin/comunas');
