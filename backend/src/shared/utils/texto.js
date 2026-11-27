import { HttpError } from './httpError.js';

// Texto opcional que llega en el cuerpo de una petición: devuelve el texto sin espacios
// sobrantes o null si viene vacío. Si llega algo que no es texto (un número, un objeto),
// responde 400 en vez de provocar un error 500 al llamar a .trim().
export function textoOpcional(valor, campo, largoMaximo = 255) {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'string') throw new HttpError(400, `${campo} debe ser texto`);
  const texto = valor.trim();
  if (texto.length > largoMaximo) throw new HttpError(400, `${campo} admite hasta ${largoMaximo} caracteres`);
  return texto || null;
}
