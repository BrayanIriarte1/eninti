import { HttpError } from './httpError.js';

// Fotos del trabajo realizado (cierre de orden). Llegan desde el navegador como
// data URL en base64, ya reducidas; aquí se validan tipo, cantidad y tamaño.
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
export const MAX_FOTOS = 4;
// 4 fotos de 2 MB en base64 (~10,7 MB) caben en el límite de 12 MB del body (app.js)
const MAX_BYTES = 2 * 1024 * 1024;

export function decodificarFotos(fotos) {
  if (!Array.isArray(fotos) || fotos.length === 0) {
    throw new HttpError(400, 'Adjunta al menos una foto del trabajo realizado');
  }
  if (fotos.length > MAX_FOTOS) throw new HttpError(400, `Puedes adjuntar hasta ${MAX_FOTOS} fotos`);
  return fotos.map((f, i) => {
    const m = typeof f === 'string' ? DATA_URL.exec(f) : null;
    if (!m) throw new HttpError(400, `La foto ${i + 1} no es una imagen JPG, PNG o WebP válida`);
    const datos = Buffer.from(m[2], 'base64');
    if (datos.length > MAX_BYTES) throw new HttpError(400, `La foto ${i + 1} supera los 2 MB`);
    return { tipo: m[1], datos };
  });
}

export async function guardarFotos(conexion, idMantencion, fotos) {
  for (const f of fotos) {
    await conexion.query(
      'INSERT INTO mantencion_foto (id_mantencion, tipo_mime, datos) VALUES ($1, $2, $3)',
      [idMantencion, f.tipo, f.datos],
    );
  }
}

// Devuelve las fotos de una orden listas para mostrarse en un <img>
export async function fotosDeOrden(conexion, idMantencion) {
  const { rows } = await conexion.query(
    `SELECT id_foto, tipo_mime, encode(datos, 'base64') AS b64, fecha_subida
     FROM mantencion_foto WHERE id_mantencion = $1 ORDER BY id_foto`,
    [idMantencion],
  );
  return rows.map((r) => ({ id_foto: r.id_foto, fecha_subida: r.fecha_subida, url: `data:${r.tipo_mime};base64,${r.b64}` }));
}
