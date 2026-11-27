// Llamadas sin sesión (CU-01, CU-02, CU-09 pasarela simulada) · Backend: publico.routes.js, pagos.routes.js
import { api } from '../../../shared/utils/api.js';

// [CU-01]
export const catalogoPublico = () => api('/publico/catalogo');
// [CU-09] pasarela simulada
export const confirmarPasarela = (datos) => api('/pagos/simulada/confirmar', { method: 'POST', body: datos });
// [CU-02]
export const listarComunasPublicas = () => api('/publico/comunas');
// [CU-02]
export const solicitarCuenta = (datos) => api('/publico/solicitudes-cuenta', { method: 'POST', body: datos });
