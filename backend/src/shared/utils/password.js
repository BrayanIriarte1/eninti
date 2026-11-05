import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);

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
