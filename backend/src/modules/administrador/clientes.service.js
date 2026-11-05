import { query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';

// Listados básicos para selectores y administración de clientes (HU-03)
export async function listar() {
  const { rows } = await query(
    `SELECT c.id_cliente, c.rut, c.nombre, c.telefono, c.direccion, c.id_comuna,
            co.nombre AS comuna,
            c.id_usuario IS NOT NULL AS tiene_cuenta,
            count(p.id_planta)::int AS plantas
     FROM cliente c
     LEFT JOIN comuna co ON co.id_comuna = c.id_comuna
     LEFT JOIN planta p  ON p.id_cliente = c.id_cliente
     GROUP BY c.id_cliente, co.nombre
     ORDER BY c.nombre`,
  );
  return rows;
}

export async function listarComunas() {
  const { rows } = await query('SELECT id_comuna, nombre FROM comuna ORDER BY nombre');
  return rows;
}

function validar({ rut, nombre, telefono, direccion, id_comuna }, { parcial }) {
  const errores = [];
  if (!parcial || rut !== undefined) {
    if (typeof rut !== 'string' || !/^\d{7,8}-[\dkK]$/.test(rut?.trim() ?? '')) {
      errores.push('rut debe tener formato 12345678-9');
    }
  }
  if (!parcial || nombre !== undefined) {
    if (typeof nombre !== 'string' || !nombre.trim()) errores.push('nombre es obligatorio');
  }
  if (telefono !== undefined && telefono !== null && typeof telefono !== 'string') errores.push('telefono no es válido');
  if (direccion !== undefined && direccion !== null && typeof direccion !== 'string') errores.push('direccion no es válida');
  if (id_comuna !== undefined && id_comuna !== null && (!Number.isInteger(id_comuna) || id_comuna <= 0)) {
    errores.push('id_comuna no es válida');
  }
  if (errores.length) throw new HttpError(400, 'Datos del cliente inválidos', errores);
}

// Alta de la ficha administrativa del cliente (HU-03); la cuenta web la crea
// el propio cliente después con su RUT (HU-07).
export async function crear(datos) {
  validar(datos, { parcial: false });
  const { rows } = await query(
    `INSERT INTO cliente (rut, nombre, telefono, direccion, id_comuna)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [datos.rut.trim(), datos.nombre.trim(), datos.telefono ?? null, datos.direccion ?? null, datos.id_comuna ?? null],
  );
  return rows[0];
}

export async function actualizar(id, datos) {
  validar(datos, { parcial: true });
  const { rut, nombre, telefono, direccion, id_comuna } = datos;
  if ([rut, nombre, telefono, direccion, id_comuna].every((v) => v === undefined)) {
    throw new HttpError(400, 'No hay campos para actualizar');
  }
  const { rows } = await query(
    `UPDATE cliente
     SET rut       = COALESCE($2, rut),
         nombre    = COALESCE($3, nombre),
         telefono  = COALESCE($4, telefono),
         direccion = COALESCE($5, direccion),
         id_comuna = COALESCE($6, id_comuna)
     WHERE id_cliente = $1
     RETURNING *`,
    [id, rut?.trim() ?? null, nombre?.trim() ?? null, telefono ?? null, direccion ?? null, id_comuna ?? null],
  );
  if (!rows.length) throw new HttpError(404, 'Cliente no encontrado');
  return rows[0];
}
