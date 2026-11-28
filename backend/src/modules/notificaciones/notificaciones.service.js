// CU-37 · NOTIFICACIONES EN LA PLATAFORMA (campana de los tres paneles).
// avisar() se llama después de que la operación principal ya se guardó: nunca lanza errores,
// para que un problema al notificar no deshaga ni bloquee una reserva, un pago o una orden.
import { query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';

const MAXIMO_LISTADO = 30;
const DIAS_RETENCION_LEIDAS = 90;
const corta = (v, n) => (v == null ? null : String(v).slice(0, n));

// destino: 'administradores' | id de usuario | lista de ids. Devuelve cuántas se crearon.
export async function avisar(destino, { tipo, titulo, detalle, ruta }) {
  try {
    const params = [corta(tipo, 40), corta(titulo, 160), corta(detalle, 300), corta(ruta, 200)];
    if (destino === 'administradores') {
      const { rowCount } = await query(
        `INSERT INTO notificacion (id_usuario, tipo, titulo, detalle, ruta)
         SELECT id_usuario, $1, $2, $3, $4 FROM usuario WHERE rol = 'administrador' AND activo`,
        params,
      );
      return rowCount;
    }
    const ids = [].concat(destino).filter((id) => Number.isInteger(id) && id > 0);
    if (!ids.length) return 0;
    const { rowCount } = await query(
      `INSERT INTO notificacion (id_usuario, tipo, titulo, detalle, ruta)
       SELECT u.id_usuario, $1, $2, $3, $4 FROM usuario u WHERE u.id_usuario = ANY($5::int[]) AND u.activo`,
      [...params, ids],
    );
    return rowCount;
  } catch (err) {
    console.error('Notificación no registrada:', err.message);
    return 0;
  }
}

// Usuario web del cliente (null si aún no tiene cuenta: entonces no hay a quién avisar)
export async function usuarioDeCliente(idCliente) {
  const { rows } = await query('SELECT id_usuario FROM cliente WHERE id_cliente = $1', [idCliente]);
  return rows[0]?.id_usuario ?? null;
}

// Datos de una orden para redactar los avisos (cliente, técnico y planta)
export async function datosOrden(idMantencion) {
  const { rows } = await query(
    `SELECT m.id_mantencion, m.estado, m.tipo, m.fecha_programada, m.id_trabajador,
            p.direccion, co.nombre AS comuna, c.nombre AS cliente, c.id_usuario AS id_usuario_cliente,
            u.nombre AS trabajador
     FROM mantencion m
     JOIN planta p ON p.id_planta = m.id_planta
     JOIN comuna co ON co.id_comuna = p.id_comuna
     JOIN cliente c ON c.id_cliente = p.id_cliente
     LEFT JOIN usuario u ON u.id_usuario = m.id_trabajador
     WHERE m.id_mantencion = $1`,
    [idMantencion],
  );
  return rows[0] ?? null;
}

// [CU-37] Las de un usuario (más recientes primero) y cuántas no ha leído
export async function listar(idUsuario) {
  const { rows } = await query(
    `SELECT id_notificacion, tipo, titulo, detalle, ruta, fecha, leida_en
     FROM notificacion WHERE id_usuario = $1
     ORDER BY fecha DESC, id_notificacion DESC LIMIT $2`,
    [idUsuario, MAXIMO_LISTADO],
  );
  const { rows: [{ no_leidas }] } = await query(
    'SELECT count(*)::int AS no_leidas FROM notificacion WHERE id_usuario = $1 AND leida_en IS NULL',
    [idUsuario],
  );
  return { no_leidas, notificaciones: rows };
}

// [CU-37] Solo puede marcar las propias: una ajena responde 404
export async function marcarLeida(idUsuario, idNotificacion) {
  const { rowCount } = await query(
    `UPDATE notificacion SET leida_en = COALESCE(leida_en, now())
     WHERE id_notificacion = $1 AND id_usuario = $2`,
    [idNotificacion, idUsuario],
  );
  if (!rowCount) throw new HttpError(404, 'Notificación no encontrada');
  return { ok: true };
}

// [CU-37]
export async function marcarTodas(idUsuario) {
  const { rowCount } = await query(
    'UPDATE notificacion SET leida_en = now() WHERE id_usuario = $1 AND leida_en IS NULL',
    [idUsuario],
  );
  return { marcadas: rowCount };
}

// Limpieza: las leídas con más de 90 días (al iniciar y una vez al día)
export async function limpiarAntiguas() {
  try {
    await query(`DELETE FROM notificacion WHERE leida_en IS NOT NULL AND fecha < now() - make_interval(days => $1)`, [DIAS_RETENCION_LEIDAS]);
  } catch (err) {
    console.error('Limpieza de notificaciones:', err.message);
  }
}
export function programarLimpieza() {
  limpiarAntiguas();
  return setInterval(limpiarAntiguas, 24 * 60 * 60 * 1000).unref();
}
