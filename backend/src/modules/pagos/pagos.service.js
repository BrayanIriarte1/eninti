// CONFIRMACIÓN DE LA INSCRIPCIÓN DE TARJETA (CU-09). Guarda solo token + últimos 4 dígitos.
import { query } from '../../config/db.js';
import { HttpError } from '../../shared/utils/httpError.js';
import { enTransaccion } from '../../shared/utils/transaccion.js';
import { consultarInscripcionFlow, validarTokenInscripcion } from './pasarela.service.js';
import { avisarSuscripcionConfirmada, enSegundoPlano } from '../notificaciones/correo.service.js';

// Guarda el resultado de una inscripción. Un solo medio de pago activo por cliente: el nuevo
// reemplaza al anterior. Si ya existe un medio activo con el mismo token (notificación
// repetida), se devuelve ese registro sin duplicarlo (idempotencia).
async function registrarMedioPago({ idCliente, token, marca, ultimos4, estado }) {
  const resultado = await enTransaccion(async (conexion) => {
    // Serializa las inscripciones del mismo cliente
    await conexion.query('SELECT 1 FROM cliente WHERE id_cliente = $1 FOR UPDATE', [idCliente]);
    const { rows: previo } = await conexion.query(
      `SELECT * FROM medio_pago WHERE token_pasarela = $1 AND id_cliente = $2 AND estado <> 'inactivo'
       ORDER BY id_medio_pago DESC LIMIT 1`,
      [token, idCliente],
    );
    if (previo.length && (previo[0].estado === 'activo' || estado === 'rechazado')) {
      return { medio: previo[0], nuevo: false };
    }
    if (estado === 'activo') {
      await conexion.query(
        `UPDATE medio_pago SET estado = 'inactivo' WHERE id_cliente = $1 AND estado = 'activo'`,
        [idCliente],
      );
    }
    const { rows } = await conexion.query(
      `INSERT INTO medio_pago (id_cliente, token_pasarela, marca, ultimos_4, estado)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [idCliente, token, marca, ultimos4, estado],
    );
    return { medio: rows[0], nuevo: true };
  });
  // HU-13: confirmación por correo al activar el cobro recurrente
  if (resultado.nuevo && resultado.medio.estado === 'activo') enSegundoPlano(avisarSuscripcionConfirmada(idCliente));
  return resultado.medio;
}

// [CU-09] Paso final del modo simulado. Idempotente: el mismo token no crea dos tarjetas.
// Confirmación de la pasarela simulada (HU-13). El token JWT emitido al iniciar la
// inscripción autoriza esta llamada; una notificación repetida no duplica el medio de pago.
export async function confirmarInscripcionSimulada(token, { resultado, marca, ultimos_4 }) {
  const datos = validarTokenInscripcion(token);

  if (!['aprobada', 'rechazada'].includes(resultado)) {
    throw new HttpError(400, 'resultado debe ser aprobada o rechazada');
  }
  if (resultado === 'aprobada' && !/^[0-9]{4}$/.test(ultimos_4 ?? '')) {
    throw new HttpError(400, 'ultimos_4 debe ser 4 dígitos');
  }

  const tokenPasarela = `sim-tok-${datos.nonce}`;
  const { rows: previo } = await query('SELECT * FROM medio_pago WHERE token_pasarela = $1', [tokenPasarela]);
  if (previo.length) return previo[0];

  // Tarjeta de prueba 0000: la pasarela simulada la rechaza siempre (caso de rechazo, objetivo 3)
  const rechazaTarjeta = resultado === 'aprobada' && ultimos_4 === '0000';
  return registrarMedioPago({
    idCliente: datos.idCliente,
    token: tokenPasarela,
    marca: typeof marca === 'string' && marca.trim() ? marca.trim().slice(0, 20) : null,
    ultimos4: /^[0-9]{4}$/.test(ultimos_4 ?? '') ? ultimos_4 : null,
    estado: resultado === 'aprobada' && !rechazaTarjeta ? 'activo' : 'rechazado',
  });
}

// [CU-09] Paso final con Flow sandbox.
// Retorno de Flow sandbox (HU-13). Flow envía solo un token; el estado real de la
// inscripción se consulta en el servidor con getRegisterStatus y el cliente se identifica
// por el customerId guardado al iniciar la inscripción.
export async function confirmarInscripcionFlow(token) {
  const r = await consultarInscripcionFlow(token);
  if (!r.customerId) throw new HttpError(400, 'Flow no informó el cliente de la inscripción');
  const { rows } = await query('SELECT id_cliente FROM cliente WHERE flow_customer_id = $1', [r.customerId]);
  if (!rows.length) throw new HttpError(404, 'La inscripción no corresponde a ningún cliente de ENINTI');

  return registrarMedioPago({
    idCliente: rows[0].id_cliente,
    token: r.customerId, // Flow cobra con el customerId; nunca se guarda la tarjeta
    marca: r.marca ? String(r.marca).slice(0, 20) : null,
    ultimos4: r.ultimos4,
    estado: r.registrado ? 'activo' : 'rechazado',
  });
}
