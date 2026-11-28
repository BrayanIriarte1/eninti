// CAPA SERVICIO · Plantas y ficha técnica (CU-14 «extend» Registrar planta).
// Para agregar un campo a la planta: columna nueva en database/schema/ + una línea en CAMPOS.
import { query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import { enTransaccion } from '../../shared/utils/transaccion.js';

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

// [CU-14] Valida cada campo según su tipo en CAMPOS; parcial=true para editar.
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
         ) END AS suscripcion,
         -- Sin suscripción vigente: si tuvo una y se canceló, para no mostrarla como «sin suscripción»
         CASE WHEN s.id_suscripcion IS NULL THEN (
           SELECT json_build_object('fecha_cancelacion', sc.fecha_cancelacion, 'motivo_cancelacion', sc.motivo_cancelacion)
           FROM suscripcion sc WHERE sc.id_planta = p.id_planta AND sc.estado = 'cancelada'
           ORDER BY sc.fecha_cancelacion DESC, sc.id_suscripcion DESC LIMIT 1
         ) END AS ultima_cancelada
  FROM planta p
  JOIN cliente c ON c.id_cliente = p.id_cliente
  JOIN comuna co ON co.id_comuna = p.id_comuna
  LEFT JOIN suscripcion s ON s.id_planta = p.id_planta AND s.estado <> 'cancelada'`;

// [CU-14] Filtros dinámicos: los valores van como $1, $2 (nunca concatenados).
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

// [CU-14]
export async function obtener(id) {
  const { rows } = await query(`${SELECT_PLANTA} WHERE p.id_planta = $1`, [id]);
  if (!rows.length) throw new HttpError(404, 'Planta no encontrada');
  return rows[0];
}

// [CU-14, CU-36] Valida la ficha y crea la planta con la conexión recibida (puede ser una
// transacción: la aprobación de una solicitud de planta la usa así). Devuelve el id creado.
export async function insertarPlanta(conexion, datos) {
  const planta = validar(datos, { parcial: false });
  const campos = Object.keys(planta);
  const { rows } = await conexion.query(
    `INSERT INTO planta (${campos.join(', ')})
     VALUES (${campos.map((_, i) => `$${i + 1}`).join(', ')})
     RETURNING id_planta`,
    Object.values(planta),
  );
  return rows[0].id_planta;
}

// [CU-14]
export async function crear(datos) {
  return obtener(await insertarPlanta({ query }, datos));
}

// [CU-14]
export async function actualizar(id, datos) {
  const cambios = validar(datos, { parcial: true });
  const campos = Object.keys(cambios);
  await enTransaccion(async (conexion) => {
    const { rows } = await conexion.query('SELECT id_cliente FROM planta WHERE id_planta = $1 FOR UPDATE', [id]);
    if (!rows.length) throw new HttpError(404, 'Planta no encontrada');
    if (cambios.id_cliente !== undefined && cambios.id_cliente !== rows[0].id_cliente) {
      await validarTraspaso(conexion, id);
    }
    await conexion.query(
      `UPDATE planta
       SET ${campos.map((c, i) => `${c} = $${i + 2}`).join(', ')}
       WHERE id_planta = $1`,
      [id, ...Object.values(cambios)],
    );
  });
  return obtener(id);
}

// [CU-14]
// Cambiar el dueño de una planta solo se permite si no arrastra compromisos del cliente
// anterior: una suscripción vigente, cuotas sin pagar (incluida la deuda de una suscripción
// cancelada por morosidad) o visitas abiertas. Así la deuda nunca pasa a otra persona.
async function validarTraspaso(conexion, idPlanta) {
  const { rows: [r] } = await conexion.query(
    `SELECT
       EXISTS (SELECT 1 FROM suscripcion s WHERE s.id_planta = $1 AND s.estado <> 'cancelada') AS suscripcion,
       (SELECT count(*) FROM cuota c JOIN suscripcion s USING (id_suscripcion)
        WHERE s.id_planta = $1 AND c.estado IN ('pendiente', 'vencida'))::int AS cuotas,
       (SELECT count(*) FROM mantencion m
        WHERE m.id_planta = $1 AND m.estado IN ('pendiente', 'en_curso', 'por_confirmar'))::int AS visitas`,
    [idPlanta],
  );
  const motivos = [];
  if (r.suscripcion) motivos.push('tiene una suscripción vigente: cancélala primero');
  if (r.cuotas) motivos.push(`tiene ${r.cuotas} cuota(s) sin pagar del cliente actual: regístralas o cóbralas primero`);
  if (r.visitas) motivos.push(`tiene ${r.visitas} visita(s) abierta(s): ciérralas o cancélalas primero`);
  if (motivos.length) {
    throw new HttpError(409, 'No se puede cambiar el cliente de esta planta', motivos);
  }
}
