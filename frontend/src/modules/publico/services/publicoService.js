import { api } from '../../../shared/utils/api.js';

export const catalogoPublico = () => api('/publico/catalogo');
export const confirmarPasarela = (datos) => api('/pagos/simulada/confirmar', { method: 'POST', body: datos });
export const listarComunasPublicas = () => api('/publico/comunas');
export const solicitarCuenta = (datos) => api('/publico/solicitudes-cuenta', { method: 'POST', body: datos });
