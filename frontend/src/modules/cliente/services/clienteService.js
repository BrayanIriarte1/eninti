// Llamadas del portal del cliente a /api/cliente/... (una función por endpoint).
// Si cambia una URL del backend, se corrige SOLO aquí. Backend: cliente.routes.js
import { api } from '../../../shared/utils/api.js';

// [CU-04]
export const miCuenta = () => api('/cliente/cuenta');
// [CU-06]
export const misPlantas = () => api('/cliente/plantas');
// [CU-06]
export const obtenerPlanta = (id) => api(`/cliente/plantas/${id}`);
// [CU-05]
export const misMantenciones = () => api('/cliente/mantenciones');
// [CU-07]
export const misSolicitudes = () => api('/cliente/solicitudes');
// [CU-07]
export const crearSolicitud = (datos) => api('/cliente/solicitudes', { method: 'POST', body: datos });
// [CU-08]
export const cancelarSuscripcion = (id) => api(`/cliente/suscripciones/${id}/cancelar`, { method: 'POST' });
// [CU-09] datos = { acepta_condiciones: true, version_condiciones }
export const iniciarInscripcion = (id, datos) =>
  api(`/cliente/suscripciones/${id}/inscripcion`, { method: 'POST', body: datos });

// [CU-23]
// Cierre de órdenes con fotos del técnico
export const ordenesPorConfirmar = () => api('/cliente/ordenes/por-confirmar');
// [CU-23]
export const confirmarOrden = (id, datos) => api(`/cliente/ordenes/${id}/confirmar`, { method: 'POST', body: datos });

// [CU-24]
// Solicitud de suscripción (la otorga el administrador)
export const solicitarSuscripcion = (datos) => api('/cliente/solicitudes-suscripcion', { method: 'POST', body: datos });

// [CU-25]
// Mis datos y solicitud de cambio de correo o teléfono
export const misDatos = () => api('/cliente/datos');
// [CU-25]
export const solicitarCambioDatos = (datos) => api('/cliente/datos/solicitudes', { method: 'POST', body: datos });
