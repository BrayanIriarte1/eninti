// Plantas y suscripciones (CU-14) · Backend: administrador.routes.js → plantas/suscripciones
import { api } from '../../../shared/utils/api.js';

// [CU-14]
export const listarPlantas = () => api('/admin/plantas');
export const obtenerPlanta = (id) => api(`/admin/plantas/${id}`);
export const crearPlanta = (datos) => api('/admin/plantas', { method: 'POST', body: datos });
export const actualizarPlanta = (id, datos) => api(`/admin/plantas/${id}`, { method: 'PUT', body: datos });

// [CU-14] suscripciones de una planta
export const listarSuscripciones = (plantaId) => api(`/admin/plantas/${plantaId}/suscripciones`);
export const crearSuscripcion = (plantaId, datos) =>
  api(`/admin/plantas/${plantaId}/suscripciones`, { method: 'POST', body: datos });
// [CU-14, CU-32] cambiar cuota/día o { estado: 'cancelada' }
export const actualizarSuscripcion = (id, datos) =>
  api(`/admin/suscripciones/${id}`, { method: 'PATCH', body: datos });

export const listarClientes = () => api('/admin/clientes');
export const listarComunas = () => api('/admin/comunas');
