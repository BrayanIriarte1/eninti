import { HttpError } from '../utils/httpError.js';

// Cabeceras HTTP básicas de seguridad (sin dependencias externas)
export function cabecerasSeguridad(_req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  next();
}

// Límite de peticiones por IP en memoria, para formularios públicos (solicitud de cuenta).
// Suficiente para un solo proceso; con varias instancias debería moverse a la base de datos.
export function limitarTasa({ maximo, ventanaMs, mensaje }) {
  const registros = new Map();
  return (req, _res, next) => {
    const ahora = Date.now();
    const clave = req.ip;
    const r = registros.get(clave);
    if (!r || r.desde + ventanaMs < ahora) {
      registros.set(clave, { desde: ahora, n: 1 });
      if (registros.size > 10000) registros.clear();
      return next();
    }
    r.n += 1;
    if (r.n > maximo) throw new HttpError(429, mensaje ?? 'Demasiadas solicitudes. Inténtalo más tarde');
    next();
  };
}
