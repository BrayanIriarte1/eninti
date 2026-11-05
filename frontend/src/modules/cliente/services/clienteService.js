import { api } from '../../../shared/utils/api.js';

export const miCuenta = () => api('/cliente/cuenta');
export const misPlantas = () => api('/cliente/plantas');
export const obtenerPlanta = (id) => api(`/cliente/plantas/${id}`);
export const misMantenciones = () => api('/cliente/mantenciones');
export const misSolicitudes = () => api('/cliente/solicitudes');
export const crearSolicitud = (datos) => api('/cliente/solicitudes', { method: 'POST', body: datos });
export const cancelarSuscripcion = (id) => api(`/cliente/suscripciones/${id}/cancelar`, { method: 'POST' });
export const iniciarInscripcion = (id, datos) =>
  api(`/cliente/suscripciones/${id}/inscripcion`, { method: 'POST', body: datos });
