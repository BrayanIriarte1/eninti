// CONTRASEÑAS (CU-03, CU-13, CU-15, CU-26, CU-27): hash scrypt con sal y reglas de una clave válida.
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);

// Nunca se guarda la contraseña: se guarda "sal:hash".
// Hash scrypt con sal aleatoria, formato 'sal:hash' en hexadecimal (RNF-10, OWASP)
export async function hashPassword(password) {
  const sal = randomBytes(16).toString('hex');
  const hash = await scrypt(password, sal, 64);
  return `${sal}:${hash.toString('hex')}`;
}

export async function verificarPassword(password, almacenado) {
  const [sal, hashHex] = (almacenado ?? '').split(':');
  if (!sal || !hashHex) return false;
  const esperado = Buffer.from(hashHex, 'hex');
  const hash = await scrypt(password, sal, 64);
  return hash.length === esperado.length && timingSafeEqual(hash, esperado);
}

// Reglas de una contraseña (RNF-10): 8 a 128 caracteres con letras y números.
// Las usan el cambio y la recuperación de contraseña y las cuentas que crea el administrador.
export const MINIMO_CONTRASENA = 8;
export const MAXIMO_CONTRASENA = 128;
// [CU-13, CU-15, CU-26, CU-27] Para exigir más (ej. mayúscula), agrega una regla aquí.
export function erroresContrasena(clave) {
  if (typeof clave !== 'string' || !clave) return ['La contraseña es obligatoria'];
  const errores = [];
  if (clave.length < MINIMO_CONTRASENA) errores.push(`Debe tener al menos ${MINIMO_CONTRASENA} caracteres`);
  if (clave.length > MAXIMO_CONTRASENA) errores.push(`Debe tener como máximo ${MAXIMO_CONTRASENA} caracteres`);
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(clave) || !/\d/.test(clave)) errores.push('Debe combinar letras y números');
  return errores;
}
