// ADAPTADOR DE LA PASARELA DE PAGO (CU-09 inscribir tarjeta, CU-20 cobrar).
// Único archivo que conoce a la pasarela. FLOW_MODE=simulado (por defecto, sin Internet) o sandbox (Flow).
import { createHmac, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { HttpError } from '../../shared/utils/httpError.js';

// Adaptador de la pasarela de pagos (HU-13, RNF-03). Es el único archivo que conoce a Flow:
// reemplazar la pasarela no obliga a tocar el resto del sistema.
// FLOW_MODE=simulado  → pasarela simulada local para la demostración académica (por defecto).
// FLOW_MODE=sandbox   → API de Flow en sandbox.flow.cl (requiere FLOW_API_KEY y FLOW_SECRET_KEY).
// En ningún modo pasan números de tarjeta por el backend de ENINTI: solo el customerId de
// Flow (o un token simulado), la marca y los últimos 4 dígitos.

export const modo = () => process.env.FLOW_MODE ?? 'simulado';
const FLOW_URL = () => process.env.FLOW_API_URL ?? 'https://sandbox.flow.cl/api';

// --- Cliente HTTP de Flow ---------------------------------------------------------------
// Firma: todos los parámetros salvo 's', ordenados por nombre, concatenados nombre+valor y
// firmados con HMAC-SHA256 usando la secretKey (documentación oficial de Flow).
export function firmarParams(params, secreto = process.env.FLOW_SECRET_KEY) {
  const cadena = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join('');
  return createHmac('sha256', secreto).update(cadena).digest('hex');
}

async function llamarFlow(endpoint, params, metodo = 'POST') {
  if (!process.env.FLOW_API_KEY || !process.env.FLOW_SECRET_KEY) {
    throw new HttpError(503, 'La pasarela Flow no está configurada (FLOW_API_KEY / FLOW_SECRET_KEY)');
  }
  const conFirma = { ...params, apiKey: process.env.FLOW_API_KEY };
  conFirma.s = firmarParams(conFirma);
  const cuerpo = new URLSearchParams(conFirma);

  let res;
  try {
    res = metodo === 'GET'
      ? await fetch(`${FLOW_URL()}${endpoint}?${cuerpo}`, { signal: AbortSignal.timeout(15000) })
      : await fetch(`${FLOW_URL()}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: cuerpo,
          signal: AbortSignal.timeout(15000),
        });
  } catch (err) {
    throw new HttpError(502, 'No fue posible comunicarse con la pasarela de pagos', err.message);
  }

  const datos = await res.json().catch(() => null);
  if (!res.ok) throw new HttpError(502, `Flow respondió ${res.status}`, datos?.message);
  return datos;
}

// [CU-09] Devuelve la URL a la que se redirige al cliente para inscribir su tarjeta.
// --- Inscripción del medio de pago -------------------------------------------------------
// Devuelve la URL a la que se redirige al cliente para registrar su tarjeta.
export async function iniciarInscripcion({ idCliente, idSuscripcion, email, nombre, flowCustomerId }) {
  if (modo() === 'sandbox') {
    if (!email) throw new HttpError(400, 'Tu cuenta no tiene correo registrado; Flow lo exige para inscribir la tarjeta');
    let customerId = flowCustomerId;
    if (!customerId) {
      const cliente = await llamarFlow('/customer/create', { name: nombre, email, externalId: `eninti-cliente-${idCliente}` });
      customerId = cliente.customerId;
    }
    // Flow redirige el navegador del cliente con un POST (parámetro token) a url_return
    const base = process.env.API_URL ?? process.env.APP_URL ?? '';
    const registro = await llamarFlow('/customer/register', {
      customerId,
      url_return: `${base}/api/pagos/flow/retorno`,
    });
    return { proveedor: 'flow-sandbox', customerId, url_pasarela: `${registro.url}?token=${registro.token}` };
  }

  // Pasarela simulada: el "token de inscripción" es un JWT corto que lleva el contexto
  // hasta el formulario simulado, sin estado adicional en el servidor.
  const token = jwt.sign(
    { tipo: 'inscripcion', idCliente, idSuscripcion, nonce: randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: '30m' },
  );
  return { proveedor: 'simulado', customerId: `sim-${idCliente}`, url_pasarela: `/pasarela-simulada?token=${token}` };
}

// Resultado de la inscripción en Flow: se consulta al proveedor, nunca se confía en el retorno
// del navegador (U2, 3.1.1).
export async function consultarInscripcionFlow(token) {
  if (typeof token !== 'string' || !token) throw new HttpError(400, 'Falta el token de Flow');
  const r = await llamarFlow('/customer/getRegisterStatus', { token }, 'GET');
  const ultimos = String(r.last4CardDigits ?? '').slice(-4);
  return {
    registrado: String(r.status) === '1',
    customerId: r.customerId,
    marca: r.creditCardType ?? null,
    ultimos4: /^[0-9]{4}$/.test(ultimos) ? ultimos : null,
  };
}

// [CU-09] Modo simulado: el token JWT de 30 min que viaja a /pasarela-simulada.
export function validarTokenInscripcion(token) {
  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    if (datos.tipo !== 'inscripcion') throw new Error('tipo');
    return datos;
  } catch {
    throw new HttpError(401, 'Token de inscripción inválido o expirado');
  }
}

// [CU-20, CU-34] Simulado: aprueba siempre, salvo tarjeta terminada en 0000 (rechazo).
// --- Cargo recurrente de una cuota -------------------------------------------------------
// Devuelve { estado: 'aprobado' | 'rechazado' | 'pendiente', referencia }.
// En Flow, status 2 = pagado y 1 = pendiente; cualquier otro valor se trata como rechazo.
// En modo simulado la tarjeta terminada en 0002 se inscribe pero sus cobros se rechazan
// (y la 0000 nunca llega a inscribirse), para probar el rechazo del objetivo específico 3.
export async function cobrar({ medioPago, monto, descripcion, idCuota }) {
  if (modo() === 'sandbox') {
    const commerceOrder = `eninti-c${idCuota}-${Date.now()}`;
    const cargo = await llamarFlow('/customer/charge', {
      customerId: medioPago.token_pasarela,
      amount: monto,
      subject: descripcion.slice(0, 100),
      commerceOrder,
    });
    const status = Number(cargo?.status);
    const estado = status === 2 ? 'aprobado' : status === 1 ? 'pendiente' : 'rechazado';
    return { estado, referencia: String(cargo?.flowOrder ?? commerceOrder) };
  }

  const aprobado = !['0000', '0002'].includes(medioPago.ultimos_4);
  return { estado: aprobado ? 'aprobado' : 'rechazado', referencia: `SIM-${randomUUID().slice(0, 8).toUpperCase()}` };
}
