// CAPA CONTROLADOR · traduce HTTP ⇄ función.
// Recorrido: administrador.routes.js (URL + rol) → ESTE archivo (lee req, valida ids con parseId) → correo.service.js (reglas + SQL).
// Aquí NO va lógica de negocio ni SQL: si te piden cambiar una regla, ve al servicio.
// req.usuario.id viene del token (middleware autenticar), nunca del navegador.
import { query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import * as correo from './correo.service.js';

// [CU-33] GET /api/admin/correo
// Panel de correo del administrador: estado de la configuración, bitácora y prueba de envío.
// Nunca devuelve la API key, solo si está definida.
export async function estado(_req, res) {
  const de = correo.remitente();
  res.json({
    modo: correo.modo(),
    remitente: `${de.name} <${de.email}>`,
    clave_configurada: Boolean(process.env.MAIL_API_KEY),
    app_url: process.env.APP_URL ?? null,
    advertencias: correo.revisarConfiguracion(),
    ...(await correo.bitacora()),
  });
}

// [CU-33] POST /api/admin/correo/prueba
export async function prueba(req, res) {
  let para = req.body?.para;
  if (para !== undefined && (typeof para !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para.trim()))) {
    throw new HttpError(400, 'Indica un correo válido');
  }
  if (!para) {
    const { rows } = await query('SELECT email FROM usuario WHERE id_usuario = $1', [req.usuario.id]);
    para = rows[0]?.email;
  }
  res.json(await correo.enviarPrueba(para.trim()));
}
