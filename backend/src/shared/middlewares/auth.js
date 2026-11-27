import jwt from 'jsonwebtoken';
import { query } from '../../config/db.js';
import { HttpError } from '../utils/httpError.js';

// Autenticación por JWT (8 h). Además de validar la firma se comprueba en la base
// que el usuario siga activo: desactivar un trabajador invalida sus tokens vigentes (HU-15).
export async function autenticar(req, _res, next) {
  // Solo desarrollo: entra como el primer administrador activo, sin login.
  // Se ignora en producción. Usa un usuario real (y no id 0) para que los registros
  // que guardan quién hizo la acción (pagos manuales, historial) no fallen.
  if (process.env.AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
    req.usuario = await administradorDeDesarrollo();
    return next();
  }

  const [tipo, token] = (req.headers.authorization ?? '').split(' ');
  if (tipo !== 'Bearer' || !token) throw new HttpError(401, 'Token requerido');

  let datos;
  try {
    datos = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Token inválido o expirado');
  }

  const { rows } = await query(
    'SELECT id_usuario, nombre, rol, activo FROM usuario WHERE id_usuario = $1',
    [datos.id],
  );
  if (!rows.length || !rows[0].activo) throw new HttpError(401, 'La cuenta no está activa');
  if (rows[0].rol !== datos.rol) throw new HttpError(401, 'Token inválido o expirado');

  req.usuario = { id: rows[0].id_usuario, rol: rows[0].rol, nombre: rows[0].nombre };
  next();
}

async function administradorDeDesarrollo() {
  const { rows } = await query(
    `SELECT id_usuario, nombre FROM usuario
     WHERE rol = 'administrador' AND activo ORDER BY id_usuario LIMIT 1`,
  );
  if (!rows.length) throw new HttpError(500, 'AUTH_BYPASS necesita al menos un administrador activo en la base');
  return { id: rows[0].id_usuario, rol: 'administrador', nombre: rows[0].nombre };
}

export const permitirRoles = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.usuario?.rol)) throw new HttpError(403, 'Acceso no permitido para este rol');
  next();
};
