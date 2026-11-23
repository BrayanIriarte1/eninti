import { query } from '../../config/db.js';

// Correo transaccional (HU-11, HU-13, HU-17). Adaptador único para poder cambiar de proveedor:
//   MAIL_MODE=consola → muestra el correo en la terminal (desarrollo y demo sin credenciales).
//   MAIL_MODE=brevo   → API transaccional de Brevo (MAIL_API_KEY).
//   MAIL_MODE=resend  → API de Resend (MAIL_API_KEY).
// Un aviso nunca debe romper la operación de negocio: se envía después de confirmar la
// transacción, los errores solo se registran y cada intento queda en la tabla aviso_correo.
// Los correos no incluyen contraseñas, tokens ni datos bancarios.

const modo = () => process.env.MAIL_MODE ?? 'consola';
const appUrl = () => process.env.APP_URL ?? '';

function remitente() {
  const valor = process.env.MAIL_FROM ?? 'ENINTI <no-responder@eninti.cl>';
  const m = /^(.*)<(.+)>$/.exec(valor);
  return m ? { name: m[1].trim(), email: m[2].trim() } : { name: 'ENINTI', email: valor.trim() };
}

const escaparHtml = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

async function enviarConProveedor({ para, asunto, texto, html }) {
  const de = remitente();
  if (modo() === 'brevo') {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.MAIL_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: de, to: [{ email: para }], subject: asunto, textContent: texto, htmlContent: html }),
    });
    if (!res.ok) throw new Error(`Brevo respondió ${res.status}`);
    return;
  }
  if (modo() === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.MAIL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${de.name} <${de.email}>`, to: [para], subject: asunto, text: texto, html }),
    });
    if (!res.ok) throw new Error(`Resend respondió ${res.status}`);
    return;
  }
  console.log(`\n✉  [correo:${modo()}] Para: ${para}\n   Asunto: ${asunto}\n   ${texto.replace(/\n/g, '\n   ')}\n`);
}

// Envía un aviso sin lanzar errores; devuelve true si salió
export async function enviarAviso({ para, asunto, lineas, motivo }) {
  if (!para) return false;
  const texto = [...lineas, '', 'ENINTI · Energías renovables', 'Este es un aviso automático; no respondas este correo.'].join('\n');
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#1f2933">
    ${lineas.map((l) => `<p>${escaparHtml(l)}</p>`).join('')}
    <p style="color:#52606d;font-size:14px">ENINTI · Energías renovables<br>Este es un aviso automático; no respondas este correo.</p></div>`;
  let estado = 'enviado';
  let detalle = null;
  try {
    await enviarConProveedor({ para, asunto, texto, html });
  } catch (err) {
    estado = 'fallido';
    detalle = err.message.slice(0, 300);
    console.error(`Correo "${asunto}" a ${para}:`, err.message);
  }
  await query(
    `INSERT INTO aviso_correo (destinatario, asunto, motivo, proveedor, estado, detalle) VALUES ($1, $2, $3, $4, $5, $6)`,
    [para, asunto.slice(0, 200), motivo, modo(), estado, detalle],
  ).catch((err) => console.error('aviso_correo:', err.message));
  return estado === 'enviado';
}

// Ejecuta un aviso en segundo plano: la respuesta HTTP no espera al proveedor de correo
export const enSegundoPlano = (promesa) => {
  Promise.resolve(promesa).catch((err) => console.error('Aviso:', err.message));
};

const fechaLarga = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// ------------------------------------------------------------ Avisos del negocio

// HU-13: medio de pago inscrito y cobro mensual activado
export async function avisarSuscripcionConfirmada(idCliente) {
  const { rows } = await query(
    `SELECT u.email, c.nombre, mp.marca, mp.ultimos_4
     FROM cliente c
     JOIN usuario u ON u.id_usuario = c.id_usuario
     LEFT JOIN medio_pago mp ON mp.id_cliente = c.id_cliente AND mp.estado = 'activo'
     WHERE c.id_cliente = $1`,
    [idCliente],
  );
  const d = rows[0];
  if (!d) return false;
  return enviarAviso({
    para: d.email,
    motivo: 'suscripcion_confirmada',
    asunto: 'Tu suscripción de mantención quedó activa',
    lineas: [
      `Hola ${d.nombre}:`,
      `Registramos tu medio de pago${d.ultimos_4 ? ` (${d.marca ?? 'tarjeta'} terminada en ${d.ultimos_4})` : ''} para el cobro mensual de tu suscripción de mantención.`,
      'Desde ahora no necesitas enviar comprobantes: cada mes el cobro se realiza automáticamente.',
      `Puedes revisar tus pagos y tu deuda en Mi cuenta: ${appUrl()}/cliente/cuenta`,
    ],
  });
}

// HU-11 / HU-17: se programó una visita para una planta del cliente
export async function avisarMantencionProgramada(idMantencion) {
  const { rows } = await query(
    `SELECT u.email, c.nombre, m.fecha_programada, m.tipo, p.direccion, co.nombre AS comuna, t.nombre AS trabajador
     FROM mantencion m
     JOIN planta p  ON p.id_planta = m.id_planta
     JOIN comuna co ON co.id_comuna = p.id_comuna
     JOIN cliente c ON c.id_cliente = p.id_cliente
     JOIN usuario u ON u.id_usuario = c.id_usuario
     LEFT JOIN usuario t ON t.id_usuario = m.id_trabajador
     WHERE m.id_mantencion = $1`,
    [idMantencion],
  );
  const d = rows[0];
  if (!d) return false;
  return enviarAviso({
    para: d.email,
    motivo: 'mantencion_programada',
    asunto: `Visita de mantención programada para el ${fechaLarga(d.fecha_programada)}`,
    lineas: [
      `Hola ${d.nombre}:`,
      `Programamos una mantención ${d.tipo} para tu planta de ${d.direccion}, ${d.comuna}, el ${fechaLarga(d.fecha_programada)}.`,
      d.trabajador ? `La atenderá ${d.trabajador}.` : 'Te confirmaremos el técnico asignado.',
      `Puedes ver tus próximas visitas en ${appUrl()}/cliente/mantenciones`,
    ],
  });
}

// HU-17: se asignó una visita a un trabajador
export async function avisarAsignacionTrabajador(idMantencion) {
  const { rows } = await query(
    `SELECT t.email, t.nombre, m.fecha_programada, p.direccion, co.nombre AS comuna
     FROM mantencion m
     JOIN usuario t ON t.id_usuario = m.id_trabajador
     JOIN planta p  ON p.id_planta = m.id_planta
     JOIN comuna co ON co.id_comuna = p.id_comuna
     WHERE m.id_mantencion = $1`,
    [idMantencion],
  );
  const d = rows[0];
  if (!d) return false;
  return enviarAviso({
    para: d.email,
    motivo: 'mantencion_asignada',
    asunto: `Nueva visita asignada: ${d.comuna}, ${fechaLarga(d.fecha_programada)}`,
    lineas: [
      `Hola ${d.nombre}:`,
      `Se te asignó la visita a ${d.direccion}, ${d.comuna}, para el ${fechaLarga(d.fecha_programada)}.`,
      `Revisa la ficha técnica en tu agenda: ${appUrl()}/trabajador/ordenes/${idMantencion}`,
    ],
  });
}

// HU-13: la pasarela rechazó el cobro mensual; el cliente debe revisar o cambiar su tarjeta
export async function avisarCobroRechazado(idCliente, monto) {
  const { rows } = await query(
    `SELECT u.email, c.nombre, mp.marca, mp.ultimos_4
     FROM cliente c
     JOIN usuario u ON u.id_usuario = c.id_usuario
     LEFT JOIN medio_pago mp ON mp.id_cliente = c.id_cliente AND mp.estado = 'activo'
     WHERE c.id_cliente = $1`,
    [idCliente],
  );
  const d = rows[0];
  if (!d) return false;
  const pesos = `$${Number(monto).toLocaleString('es-CL')}`;
  return enviarAviso({
    para: d.email,
    motivo: 'cobro_rechazado',
    asunto: 'No pudimos cobrar tu suscripción de mantención',
    lineas: [
      `Hola ${d.nombre}:`,
      `Intentamos cobrar ${pesos} de tu suscripción${d.ultimos_4 ? ` en tu ${d.marca ?? 'tarjeta'} terminada en ${d.ultimos_4}` : ''}, pero la pasarela de pagos lo rechazó.`,
      'Revisa que la tarjeta tenga cupo y esté vigente, o inscribe otra desde Mi cuenta. Volveremos a intentarlo automáticamente.',
      `Mi cuenta: ${appUrl()}/cliente/cuenta`,
    ],
  });
}
