// CAPA SERVICIO · Solicitudes de cuenta: el visitante pide (CU-02), el administrador aprueba o rechaza (CU-13).
import { pool, query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import { avisar } from '../notificaciones/notificaciones.service.js';
import { crearCuentaCliente } from './clientes.service.js';
import { normalizarRut, rutValido, telefonoValido } from '../../shared/utils/rut.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ESTADOS = ['pendiente', 'aprobada', 'rechazada'];

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

// [CU-02]
// Solicitud pública de cuenta (HU-07): el cliente no crea su cuenta, la pide.
// Se guardan sus datos y los de su planta para que el administrador los revise.
export async function crear(datos) {
  const nombre = texto(datos.nombre);
  const rut = normalizarRut(texto(datos.rut));
  const email = texto(datos.email).toLowerCase();
  const telefono = texto(datos.telefono).replace(/\s/g, '');
  const direccion = texto(datos.direccion_planta);
  const mensaje = texto(datos.mensaje);
  const { id_comuna, potencia_kw, tiene_baterias } = datos;

  const errores = [];
  if (!nombre) errores.push('nombre es obligatorio');
  if (nombre.length > 120) errores.push('nombre admite hasta 120 caracteres');
  if (!rutValido(rut)) errores.push('rut no es válido: revisa el número y el dígito verificador');
  if (!EMAIL.test(email)) errores.push('email no es válido');
  if (!telefonoValido(telefono)) errores.push('telefono debe incluir el código de país, por ejemplo +56912345678');
  if (!direccion) errores.push('direccion_planta es obligatoria');
  if (direccion.length > 200) errores.push('direccion_planta admite hasta 200 caracteres');
  if (!Number.isInteger(id_comuna) || id_comuna <= 0) errores.push('id_comuna es obligatoria');
  if (potencia_kw !== undefined && potencia_kw !== null && !(typeof potencia_kw === 'number' && potencia_kw > 0 && potencia_kw < 10000)) {
    errores.push('potencia_kw debe ser un número positivo');
  }
  if (tiene_baterias !== undefined && tiene_baterias !== null && typeof tiene_baterias !== 'boolean') {
    errores.push('tiene_baterias debe ser verdadero, falso o vacío');
  }
  if (mensaje.length > 500) errores.push('mensaje admite hasta 500 caracteres');
  if (errores.length) throw new HttpError(400, 'Datos de la solicitud inválidos', errores);

  // El candado por RUT evita que una solicitud nueva se cuele mientras el
  // administrador aprueba otra del mismo RUT (ver aprobar)
  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    await bloquearRut(conexion, rut);

    // Si el RUT ya tiene cuenta web, no se acepta otra solicitud: debe iniciar sesión
    const { rows: existente } = await conexion.query('SELECT id_usuario FROM cliente WHERE rut = $1', [rut]);
    if (existente[0]?.id_usuario) {
      throw new HttpError(409, 'Este RUT ya tiene una cuenta. Inicia sesión o contacta al administrador');
    }

    const { rows } = await conexion.query(
      `INSERT INTO solicitud_cuenta
         (nombre, rut, email, telefono, direccion_planta, id_comuna, potencia_kw, tiene_baterias, mensaje)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id_solicitud_cuenta, estado, fecha_solicitud`,
      [nombre, rut, email, telefono, direccion, id_comuna, potencia_kw ?? null, tiene_baterias ?? null, mensaje || null],
    );
    await conexion.query('COMMIT');
    await avisar('administradores', {
      tipo: 'solicitud_cuenta', titulo: `${nombre} solicita una cuenta`,
      detalle: direccion, ruta: '/admin/solicitudes-cuenta',
    });
    return rows[0];
  } catch (err) {
    await conexion.query('ROLLBACK');
    if (err.code === '23505') {
      throw new HttpError(409, 'Ya existe una solicitud pendiente para este RUT. El administrador te contactará');
    }
    throw err;
  } finally {
    conexion.release();
  }
}

// Serializa, dentro de la transacción, las operaciones sobre un mismo RUT
function bloquearRut(conexion, rut) {
  return conexion.query("SELECT pg_advisory_xact_lock(hashtext('solicitud_cuenta:' || $1))", [rut]);
}

// [CU-13]
export async function listar(estado) {
  if (estado !== undefined && !ESTADOS.includes(estado)) {
    throw new HttpError(400, `estado debe ser uno de: ${ESTADOS.join(', ')}`);
  }
  const { rows } = await query(
    `SELECT s.*, co.nombre AS comuna, u.nombre AS resuelta_por_nombre,
            c.id_usuario IS NOT NULL AS rut_con_cuenta,
            c.id_cliente AS id_cliente_existente
     FROM solicitud_cuenta s
     JOIN comuna co ON co.id_comuna = s.id_comuna
     LEFT JOIN usuario u ON u.id_usuario = s.resuelta_por
     LEFT JOIN cliente c ON c.rut = s.rut
     WHERE ($1::text IS NULL OR s.estado = $1)
     ORDER BY (s.estado = 'pendiente') DESC, s.fecha_solicitud DESC`,
    [estado ?? null],
  );
  return rows;
}

// [CU-13]
// Aprobar: en una sola transacción crea (o reutiliza) la ficha del cliente, crea su
// cuenta web con la contraseña inicial que define el administrador y cierra la solicitud.
// La planta se registra a continuación con su ficha técnica completa (HU-03).
export async function aprobar(id, idAdmin, { email, password } = {}) {
  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    // Primero el candado del RUT y luego la fila, en el mismo orden que crear(), sin interbloqueos
    const { rows: previa } = await conexion.query('SELECT rut FROM solicitud_cuenta WHERE id_solicitud_cuenta = $1', [id]);
    if (previa[0]) await bloquearRut(conexion, previa[0].rut);
    const { rows } = await conexion.query(
      'SELECT * FROM solicitud_cuenta WHERE id_solicitud_cuenta = $1 FOR UPDATE',
      [id],
    );
    const solicitud = rows[0];
    if (!solicitud) throw new HttpError(404, 'Solicitud no encontrada');
    if (solicitud.estado !== 'pendiente') throw new HttpError(409, `La solicitud ya fue ${solicitud.estado}`);

    const { rows: fichas } = await conexion.query('SELECT * FROM cliente WHERE rut = $1 FOR UPDATE', [solicitud.rut]);
    let cliente = fichas[0];
    if (!cliente) {
      const { rows: creado } = await conexion.query(
        `INSERT INTO cliente (rut, nombre, telefono, direccion, id_comuna)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [solicitud.rut, solicitud.nombre, solicitud.telefono, solicitud.direccion_planta, solicitud.id_comuna],
      );
      cliente = creado[0];
    }

    const usuario = await crearCuentaCliente(conexion, cliente, {
      email: email ?? solicitud.email,
      password,
      telefono: solicitud.telefono,
    });

    const { rows: cerrada } = await conexion.query(
      `UPDATE solicitud_cuenta
       SET estado = 'aprobada', fecha_resolucion = now(), resuelta_por = $2, id_cliente = $3
       WHERE id_solicitud_cuenta = $1
       RETURNING *`,
      [id, idAdmin, cliente.id_cliente],
    );
    await conexion.query('COMMIT');
    return { solicitud: cerrada[0], cliente: { ...cliente, id_usuario: usuario.id_usuario }, usuario };
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }
}

// [CU-13]
export async function rechazar(id, idAdmin) {
  const { rows } = await query(
    `UPDATE solicitud_cuenta
     SET estado = 'rechazada', fecha_resolucion = now(), resuelta_por = $2
     WHERE id_solicitud_cuenta = $1 AND estado = 'pendiente'
     RETURNING *`,
    [id, idAdmin],
  );
  if (!rows.length) {
    const { rows: existe } = await query('SELECT estado FROM solicitud_cuenta WHERE id_solicitud_cuenta = $1', [id]);
    if (!existe.length) throw new HttpError(404, 'Solicitud no encontrada');
    throw new HttpError(409, `La solicitud ya fue ${existe[0].estado}`);
  }
  return rows[0];
}

export async function contarPendientes() {
  const { rows } = await query("SELECT count(*)::int AS n FROM solicitud_cuenta WHERE estado = 'pendiente'");
  return rows[0].n;
}
