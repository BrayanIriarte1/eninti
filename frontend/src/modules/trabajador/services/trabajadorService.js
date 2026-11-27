// Llamadas del técnico a /api/trabajador/... · Backend: trabajador.routes.js
import { api } from '../../../shared/utils/api.js';

// [CU-10]
export const miAgenda = (historicas = false) => api(`/trabajador/agenda${historicas ? '?historicas=true' : ''}`);
// [CU-11]
export const obtenerOrden = (id) => api(`/trabajador/ordenes/${id}`);
// [CU-11, CU-12] datos = { estado, actividades, observaciones, fotos }
export const cambiarEstado = (id, datos) => api(`/trabajador/ordenes/${id}/estado`, { method: 'POST', body: datos });
