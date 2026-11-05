import { query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';

// Campos de la ficha técnica y el tipo que se valida para cada uno
const CAMPOS = {
  id_cliente: 'entero',
  id_comuna: 'entero',
  direccion: 'texto',
  potencia_kw: 'decimal',
  inversor: 'texto',
  paneles: 'texto',
  baterias: 'texto_opcional',
  fecha_instalacion: 'fecha',
};

const VALIDADORES = {
  entero: (v) => Number.isInteger(v) && v > 0,
  decimal: (v) => typeof v === 'number' && v > 0,
  texto: (v) => typeof v === 'string' && v.trim() !== '',
  texto_opcional: (v) => v === null || typeof v === 'string',
  fecha: (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v),
};

function validar(datos, { parcial }) {
  const errores = [];
  const limpio = {};

  for (const [campo, tipo] of Object.entries(CAMPOS)) {
    if (!(campo in datos)) {
      if (!parcial && tipo !== 'texto_opcional') errores.push(`${campo} es obligatorio`);
      continue;
    }
    const valor = typeof datos[campo] === 'string' ? datos[campo].trim() : datos[campo];
    if (!VALIDADORES[tipo](valor)) errores.push(`${campo} no es válido`);
    else limpio[campo] = tipo === 'texto_opcional' && valor === '' ? null : valor;
  }

  if (errores.length) throw new HttpError(400, 'Datos de la planta inválidos', errores);
  if (parcial && !Object.keys(limpio).length) throw new HttpError(400, 'No hay campos para actualizar');
  return limpio;
}

const SELECT_PLANTA = `
  SELECT p.*,
         co.nombre AS comuna,
         json_build_object('id_cliente', c.id_cliente, 'rut', c.rut, 'nombre', c.nombre) AS cliente,
         CASE WHEN s.id_suscripcion IS NULL THEN NULL ELSE json_build_object(
           'id_suscripcion', s.id_suscripcion, 'estado', s.estado, 'fecha_inicio', s.fecha_inicio,
           'monto_mensual', s.monto_mensual, 'dia_cobro', s.dia_cobro,
           'mantenciones_anuales', s.mantenciones_anuales
         ) END AS suscripcion
  FROM planta p
  JOIN cliente c ON c.id_cliente = p.id_cliente
  JOIN comuna co ON co.id_comuna = p.id_comuna
  LEFT JOIN suscripcion s ON s.id_planta = p.id_planta AND s.estado <> 'cancelada'`;

export async function listar({ id_cliente, id_comuna }) {
  const condiciones = [];
  const params = [];
  if (id_cliente) {
    params.push(id_cliente);
    condiciones.push(`p.id_cliente = $${params.length}`);
  }
  if (id_comuna) {
    params.push(id_comuna);
    condiciones.push(`p.id_comuna = $${params.length}`);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const { rows } = await query(`${SELECT_PLANTA} ${where} ORDER BY co.nombre, p.direccion`, params);
  return rows;
}

export async function obtener(id) {
  const { rows } = await query(`${SELECT_PLANTA} WHERE p.id_planta = $1`, [id]);
  if (!rows.length) throw new HttpError(404, 'Planta no encontrada');
  return rows[0];
}

export async function crear(datos) {
  const planta = validar(datos, { parcial: false });
  const campos = Object.keys(planta);
  const { rows } = await query(
    `INSERT INTO planta (${campos.join(', ')})
     VALUES (${campos.map((_, i) => `$${i + 1}`).join(', ')})
     RETURNING id_planta`,
    Object.values(planta),
  );
  return obtener(rows[0].id_planta);
}

export async function actualizar(id, datos) {
  const cambios = validar(datos, { parcial: true });
  const campos = Object.keys(cambios);
  const { rowCount } = await query(
    `UPDATE planta
     SET ${campos.map((c, i) => `${c} = $${i + 2}`).join(', ')}
     WHERE id_planta = $1`,
    [id, ...Object.values(cambios)],
  );
  if (!rowCount) throw new HttpError(404, 'Planta no encontrada');
  return obtener(id);
}
