import { api } from '../../../shared/utils/api.js';

export const catalogoPublico = () => api('/publico/catalogo');
export const confirmarPasarela = (datos) => api('/pagos/simulada/confirmar', { method: 'POST', body: datos });
