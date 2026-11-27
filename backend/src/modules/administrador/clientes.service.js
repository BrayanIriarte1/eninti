// CAPA SERVICIO · Fichas de cliente y su cuenta web (CU-14, CU-13).
import { pool, query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import { erroresContrasena, hashPassword } from '../../shared/utils/password.js';
import { normalizarRut, rutValido, telefonoValido } from '../../shared/utils/rut.js';
import { enTransaccion } from '../../shared/utils/transaccion.js';

// [CU-14]
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

// Comunas donde opera ENINTI (también la usa el formulario público de CU-02).
export async function listarComunas() {
  const { rows } = await query('SELECT id_comuna, nombre FROM comuna ORDER BY nombre');
  return rows;
}

// [CU-14] Reglas de la ficha del cliente. Agrega aquí validaciones nuevas.
function validar({ rut, nombre, telefono, direccion, id_comuna }, { parcial }) {
  const errores = [];
  if (!parcial || rut !== undefined) {
    if (typeof rut !== 'string' || !rutValido(rut)) {
      errores.push('rut no es válido: revisa el número y el dígito verificador');
    }
  }
  if (!parcial || nombre !== undefined) {
    if (typeof nombre !== 'string' || !nombre.trim()) errores.push('nombre es obligatorio');
  }
  if (telefono !== undefined && telefono !== null && telefono !== '' && !telefonoValido(telefono)) {
    errores.push('telefono debe incluir el código de país, por ejemplo +56912345678');
  }
  if (direccion !== undefined && direccion !== null && typeof direccion !== 'string') errores.push('direccion no es válida');
  if (id_comuna !== undefined && id_comuna !== null && (!Number.isInteger(id_comuna) || id_comuna <= 0)) {
    errores.push('id_comuna no es válida');
  }
  if (errores.length) throw new HttpError(400, 'Datos del cliente inválidos', errores);
}

// [CU-14]
// Alta de la ficha administrativa del cliente (HU-03). La cuenta web la crea el
// administrador (HU-07): al aprobar una solicitud de cuenta o con crearCuenta().
export async function crear(datos) {
  validar(datos, { parcial: false });
  const { rows } = await query(
    `INSERT INTO cliente (rut, nombre, telefono, direccion, id_comuna)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [normalizarRut(datos.rut), datos.nombre.trim(), datos.telefono ?? null, datos.direccion ?? null, datos.id_comuna ?? null],
  );
  return rows[0];
}

// [CU-14]
export async function actualizar(id, datos) {
  validar(datos, { parcial: true });
  const { rut, nombre, telefono, direccion, id_comuna } = datos;
  if ([rut, nombre, telefono, direccion, id_comuna].every((v) => v === undefined)) {
    throw new HttpError(400, 'No hay campos para actualizar');
  }
  return enTransaccion(async (conexion) => {
    const { rows } = await conexion.query(
      `UPDATE cliente
       SET rut       = COALESCE($2, rut),
           nombre    = COALESCE($3, nombre),
           telefono  = COALESCE($4, telefono),
           direccion = COALESCE($5, direccion),
           id_comuna = COALESCE($6, id_comuna)
       WHERE id_cliente = $1
       RETURNING *`,
      [id, rut === undefined ? null : normalizarRut(rut), nombre?.trim() ?? null, telefono ?? null, direccion ?? null, id_comuna ?? null],
    );
    if (!rows.length) throw new HttpError(404, 'Cliente no encontrado');
    // La cuenta web muestra el mismo nombre y teléfono que la ficha: se mantienen sincronizados
    if (rows[0].id_usuario && (nombre !== undefined || telefono !== undefined)) {
      await conexion.query(
        `UPDATE usuario SET nombre = $2, telefono = $3 WHERE id_usuario = $1`,
        [rows[0].id_usuario, rows[0].nombre, rows[0].telefono],
      );
    }
    return rows[0];
  });
}

// [CU-13]
// Crea la cuenta web (rol cliente) de una ficha y la enlaza. Se ejecuta dentro de la
// transacción de quien llama; la contraseña inicial la define el administrador.
export async function crearCuentaCliente(conexion, cliente, { email, password, telefono }) {
  const errores = [];
  const correo = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errores.push('email no es válido');
  errores.push(...erroresContrasena(password));
  if (errores.length) throw new HttpError(400, 'Datos de la cuenta inválidos', errores);
  if (cliente.id_usuario) throw new HttpError(409, 'Este cliente ya tiene una cuenta web');

  try {
    const { rows } = await conexion.query(
      `INSERT INTO usuario (nombre, email, password_hash, rol, telefono)
       VALUES ($1, $2, $3, 'cliente', $4)
       RETURNING id_usuario, nombre, email, rol`,
      [cliente.nombre, correo, await hashPassword(password), telefono ?? cliente.telefono ?? null],
    );
    await conexion.query('UPDATE cliente SET id_usuario = $1 WHERE id_cliente = $2', [rows[0].id_usuario, cliente.id_cliente]);
    return rows[0];
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'El correo ya está en uso por otra cuenta');
    throw err;
  }
}

// [CU-13/HU-07]
// Cuenta web para un cliente ya registrado que aún no la tiene (HU-07)
export async function crearCuenta(idCliente, datos) {
  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    const { rows } = await conexion.query('SELECT * FROM cliente WHERE id_cliente = $1 FOR UPDATE', [idCliente]);
    if (!rows.length) throw new HttpError(404, 'Cliente no encontrado');
    const usuario = await crearCuentaCliente(conexion, rows[0], datos ?? {});
    await conexion.query('COMMIT');
    return usuario;
  } catch (err) {
    await conexion.query('ROLLBACK');
    throw err;
  } finally {
    conexion.release();
  }
}
