import { query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';

// Catálogo de planes y servicios como datos (RNF-07). La parte pública alimenta el cotizador.
export async function listarPublico() {
  const { rows } = await query(
    `SELECT id_item, nombre, descripcion, tipo, precio
     FROM catalogo_servicio WHERE activo ORDER BY tipo, precio`,
  );
  return rows;
}

export async function listar() {
  const { rows } = await query('SELECT * FROM catalogo_servicio ORDER BY activo DESC, tipo, precio');
  return rows;
}

function validar({ nombre, descripcion, tipo, precio }, { parcial }) {
  const errores = [];
  if (!parcial || nombre !== undefined) {
    if (typeof nombre !== 'string' || !nombre.trim()) errores.push('nombre es obligatorio');
  }
  if (!parcial || descripcion !== undefined) {
    if (typeof descripcion !== 'string' || !descripcion.trim()) errores.push('descripcion es obligatoria');
  }
  if (!parcial || tipo !== undefined) {
    if (!['plan', 'servicio'].includes(tipo)) errores.push('tipo debe ser plan o servicio');
  }
  if (!parcial || precio !== undefined) {
    if (!Number.isInteger(precio) || precio < 0) errores.push('precio debe ser un entero mayor o igual a 0');
  }
  if (errores.length) throw new HttpError(400, 'Datos del servicio inválidos', errores);
}

export async function crear(datos) {
  validar(datos, { parcial: false });
  const { rows } = await query(
    `INSERT INTO catalogo_servicio (nombre, descripcion, tipo, precio)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [datos.nombre.trim(), datos.descripcion.trim(), datos.tipo, datos.precio],
  );
  return rows[0];
}

export async function actualizar(id, datos) {
  validar(datos, { parcial: true });
  const { nombre, descripcion, tipo, precio, activo } = datos;
  if (activo !== undefined && typeof activo !== 'boolean') {
    throw new HttpError(400, 'activo debe ser true o false');
  }
  const { rows } = await query(
    `UPDATE catalogo_servicio
     SET nombre      = COALESCE($2, nombre),
         descripcion = COALESCE($3, descripcion),
         tipo        = COALESCE($4, tipo),
         precio      = COALESCE($5, precio),
         activo      = COALESCE($6, activo)
     WHERE id_item = $1
     RETURNING *`,
    [id, nombre?.trim() ?? null, descripcion?.trim() ?? null, tipo ?? null, precio ?? null, activo ?? null],
  );
  if (!rows.length) throw new HttpError(404, 'Servicio no encontrado');
  return rows[0];
}
