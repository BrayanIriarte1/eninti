import { api, guardarToken, borrarToken } from '../../../shared/utils/api.js';

export const login = (email, password) => api('/auth/login', { method: 'POST', body: { email, password } });
export const perfil = () => api('/auth/me');

export function cerrarSesion() {
  borrarToken();
}

export function iniciarSesionLocal(token) {
  guardarToken(token);
}

// Contraseña: cambiarla con sesión iniciada o recuperarla con un enlace por correo
export const cambiarContrasena = (actual, nueva) =>
  api('/auth/cambiar-contrasena', { method: 'POST', body: { actual, nueva } });
export const recuperarContrasena = (email) => api('/auth/recuperar', { method: 'POST', body: { email } });
export const verificarEnlace = (token) => api('/auth/restablecer/verificar', { method: 'POST', body: { token } });
export const restablecerContrasena = (token, nueva) =>
  api('/auth/restablecer', { method: 'POST', body: { token, nueva } });
