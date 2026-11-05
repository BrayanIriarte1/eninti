import { api } from '../../../shared/utils/api.js';

export const miAgenda = (historicas = false) => api(`/trabajador/agenda${historicas ? '?historicas=true' : ''}`);
export const obtenerOrden = (id) => api(`/trabajador/ordenes/${id}`);
export const cambiarEstado = (id, datos) => api(`/trabajador/ordenes/${id}/estado`, { method: 'POST', body: datos });
