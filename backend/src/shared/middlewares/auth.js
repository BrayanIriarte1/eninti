import jwt from 'jsonwebtoken';
import { query } from '../../config/db.js';
import { HttpError } from '../utils/httpError.js';

// Autenticación por JWT (8 h). Además de validar la firma se comprueba en la base
// que el usuario siga activo: desactivar un trabajador invalida sus tokens vigentes (HU-15).
export async function autenticar(req, _res, next) {
  if (process.env.AUTH_BYPASS === 'true') {
    req.usuario = { id: 0, rol: 'administrador', nombre: 'Bypass desarrollo' };
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

export const permitirRoles = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.usuario?.rol)) throw new HttpError(403, 'Acceso no permitido para este rol');
  next();
};
