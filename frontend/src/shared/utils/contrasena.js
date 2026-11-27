// Requisitos de una contraseña nueva: los mismos que valida el backend
// (backend/src/shared/utils/password.js). Se muestran mientras el usuario escribe.
export const REQUISITOS = [
  { texto: 'Al menos 8 caracteres', cumple: (p) => p.length >= 8 && p.length <= 128 },
  { texto: 'Letras y números', cumple: (p) => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(p) && /\d/.test(p) },
];

export const contrasenaValida = (p) => REQUISITOS.every((r) => r.cumple(p));
