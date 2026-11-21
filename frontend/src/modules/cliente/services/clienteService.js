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

// Cierre de órdenes con fotos del técnico
export const ordenesPorConfirmar = () => api('/cliente/ordenes/por-confirmar');
export const confirmarOrden = (id, datos) => api(`/cliente/ordenes/${id}/confirmar`, { method: 'POST', body: datos });

// Solicitud de suscripción (la otorga el administrador)
export const solicitarSuscripcion = (datos) => api('/cliente/solicitudes-suscripcion', { method: 'POST', body: datos });

// Mis datos y solicitud de cambio de correo o teléfono
export const misDatos = () => api('/cliente/datos');
export const solicitarCambioDatos = (datos) => api('/cliente/datos/solicitudes', { method: 'POST', body: datos });
