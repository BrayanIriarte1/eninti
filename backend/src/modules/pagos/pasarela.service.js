import { createHmac, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { HttpError } from '../../shared/utils/httpError.js';

// Adaptador de la pasarela de pagos (HU-13, RNF-03).
// FLOW_MODE=simulado  → pasarela simulada local para la demostración académica (por defecto).
// FLOW_MODE=sandbox   → API real de Flow en sandbox.flow.cl (requiere FLOW_API_KEY y FLOW_SECRET_KEY).
// En ningún modo pasan números de tarjeta por el backend de ENINTI: solo tokens y últimos 4 dígitos.

const modo = () => process.env.FLOW_MODE ?? 'simulado';
const FLOW_URL = process.env.FLOW_API_URL ?? 'https://sandbox.flow.cl/api';

// --- Cliente HTTP de Flow: firma HMAC-SHA256 de parámetros ordenados (documentación oficial) ---
function firmarParams(params) {
  const ordenados = Object.keys(params).sort();
  const cadena = ordenados.map((k) => `${k}${params[k]}`).join('');
  return createHmac('sha256', process.env.FLOW_SECRET_KEY).update(cadena).digest('hex');
}

async function llamarFlow(endpoint, params, metodo = 'POST') {
  const conFirma = { ...params, apiKey: process.env.FLOW_API_KEY };
  conFirma.s = firmarParams(conFirma);
  const cuerpo = new URLSearchParams(conFirma);

  const res = metodo === 'GET'
    ? await fetch(`${FLOW_URL}${endpoint}?${cuerpo}`)
    : await fetch(`${FLOW_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: cuerpo,
      });

  const datos = await res.json().catch(() => null);
  if (!res.ok) {
    throw new HttpError(502, `Flow respondió ${res.status}`, datos?.message);
  }
  return datos;
}

// --- Inscripción del medio de pago ---
// Devuelve la URL a la que se redirige al cliente para registrar su tarjeta.
export async function iniciarInscripcion({ idCliente, idSuscripcion, email, nombre, urlRetorno }) {
  if (modo() === 'sandbox') {
    const externalId = `eninti-cliente-${idCliente}`;
    const cliente = await llamarFlow('/customer/create', { name: nombre, email, externalId });
    const registro = await llamarFlow('/customer/register', {
      customerId: cliente.customerId,
      url_return: urlRetorno,
    });
    return {
      proveedor: 'flow-sandbox',
      customerId: cliente.customerId,
      url_pasarela: `${registro.url}?token=${registro.token}`,
    };
  }

  // Pasarela simulada: el "token de inscripción" es un JWT corto que lleva el contexto
  // hasta el formulario simulado, sin estado adicional en el servidor.
  const token = jwt.sign(
    { tipo: 'inscripcion', idCliente, idSuscripcion, nonce: randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: '30m' },
  );
  return {
    proveedor: 'simulado',
    customerId: `sim-${idCliente}`,
    url_pasarela: `/pasarela-simulada?token=${token}`,
  };
}

export function validarTokenInscripcion(token) {
  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    if (datos.tipo !== 'inscripcion') throw new Error('tipo');
    return datos;
  } catch {
    throw new HttpError(401, 'Token de inscripción inválido o expirado');
  }
}

// --- Cargo recurrente de una cuota ---
// En modo simulado la tarjeta con últimos dígitos 0000 siempre rechaza,
// lo que permite probar el caso de rechazo exigido por el objetivo específico 3.
export async function cobrar({ medioPago, monto, descripcion }) {
  if (modo() === 'sandbox') {
    const cargo = await llamarFlow('/customer/charge', {
      customerId: medioPago.token_pasarela,
      amount: monto,
      subject: descripcion,
      commerceOrder: `eninti-${randomUUID()}`,
    });
    return { aprobado: cargo.status === 1 || cargo.status === 2, referencia: String(cargo.commerceOrder ?? cargo.token ?? '') };
  }

  const aprobado = medioPago.ultimos_4 !== '0000';
  return {
    aprobado,
    referencia: `SIM-${randomUUID().slice(0, 8).toUpperCase()}`,
  };
}
