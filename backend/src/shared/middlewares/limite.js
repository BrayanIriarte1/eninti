import { HttpError } from '../utils/httpError.js';

// Límite de peticiones por IP para rutas públicas (evita que alguien llene la base
// de solicitudes falsas). En memoria: suficiente para un solo proceso.
export function limitarPorIp({ maximo, ventanaMs, mensaje }) {
  const registros = new Map(); // ip -> fechas (ms) de las peticiones dentro de la ventana

  return (req, _res, next) => {
    const ahora = Date.now();
    const ip = req.ip ?? 'desconocida';
    const recientes = (registros.get(ip) ?? []).filter((t) => ahora - t < ventanaMs);
    if (recientes.length >= maximo) {
      registros.set(ip, recientes);
      throw new HttpError(429, mensaje);
    }
    recientes.push(ahora);
    registros.set(ip, recientes);

    // Limpieza ocasional para que el mapa no crezca sin fin
    if (registros.size > 5000) {
      for (const [clave, tiempos] of registros) {
        if (!tiempos.some((t) => ahora - t < ventanaMs)) registros.delete(clave);
      }
    }
    next();
  };
}
