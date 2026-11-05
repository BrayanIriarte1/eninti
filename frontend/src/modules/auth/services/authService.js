import { api, guardarToken, borrarToken } from '../../../shared/utils/api.js';

export const login = (email, password) => api('/auth/login', { method: 'POST', body: { email, password } });
export const registro = (datos) => api('/auth/registro', { method: 'POST', body: datos });
export const perfil = () => api('/auth/me');

export function cerrarSesion() {
  borrarToken();
}

export function iniciarSesionLocal(token) {
  guardarToken(token);
}
