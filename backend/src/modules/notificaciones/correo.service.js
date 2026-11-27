// AVISOS POR CORREO (CU-33). MAIL_MODE=consola (solo imprime) | brevo | resend.
import { query } from '../../config/db.js';

// Correo transaccional (HU-11, HU-13, HU-17). Adaptador único para poder cambiar de proveedor:
//   MAIL_MODE=consola → muestra el correo en la terminal (desarrollo y demo sin credenciales).
//   MAIL_MODE=brevo   → API transaccional de Brevo (MAIL_API_KEY).
//   MAIL_MODE=resend  → API de Resend (MAIL_API_KEY).
// Un aviso nunca debe romper la operación de negocio: se envía después de confirmar la
// transacción, los errores solo se registran y cada intento queda en la tabla aviso_correo.
// Los correos no incluyen contraseñas ni datos bancarios. La única excepción a «sin tokens»
// es el enlace de recuperación de contraseña, que es de un solo uso y vence en 1 hora; la
// bitácora guarda solo destinatario y asunto, nunca el cuerpo.

export const MODOS = ['consola', 'brevo', 'resend'];
export const modo = () => process.env.MAIL_MODE ?? 'consola';
const appUrl = () => process.env.APP_URL ?? '';
const REMITENTE_POR_DEFECTO = 'ENINTI <no-responder@eninti.cl>';

export function remitente() {
  const valor = process.env.MAIL_FROM ?? REMITENTE_POR_DEFECTO;
  const m = /^(.*)<(.+)>$/.exec(valor);
  return m ? { name: m[1].trim(), email: m[2].trim() } : { name: 'ENINTI', email: valor.trim() };
}

const escaparHtml = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Convierte en enlace cada URL de un texto ya escapado
const enlazar = (html) => html.replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" style="color:#0b5c8a">${url}</a>`);

// Plantilla HTML con la marca: tablas y estilos en línea para que se vea igual en Gmail,
// Outlook y celulares. `accion` agrega un botón (p. ej. «Crear contraseña nueva»).
export function plantillaHtml({ asunto, lineas, accion }) {
  const parrafos = lineas.map((l) => `<p style="margin:0 0 14px">${enlazar(escaparHtml(l))}</p>`).join('');
  const boton = accion
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px"><tr><td style="border-radius:12px;background:#ffc21c">
         <a href="${escaparHtml(accion.url)}" style="display:inline-block;padding:13px 24px;color:#1d1500;font-weight:bold;text-decoration:none;border-radius:12px">${escaparHtml(accion.texto)}</a>
       </td></tr></table>
       <p style="margin:0 0 14px;font-size:13px;color:#52606d">Si el botón no funciona, copia este enlace en tu navegador:<br>${enlazar(escaparHtml(accion.url))}</p>`
    : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escaparHtml(asunto)}</title></head>
<body style="margin:0;padding:0;background:#f2f5f8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f5f8;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#182433">
    <tr><td style="background:#0f1d2e;padding:20px 28px;border-bottom:4px solid #ffc21c">
      <span style="font-size:22px">&#9728;&#65039;</span>
      <span style="color:#ffffff;font-size:19px;font-weight:bold;letter-spacing:3px;vertical-align:3px">&nbsp;ENINTI</span>
    </td></tr>
    <tr><td style="padding:28px 28px 12px;font-size:16px;line-height:1.55">${parrafos}${boton}</td></tr>
    <tr><td style="padding:16px 28px 24px;border-top:1px solid #e2e8ef;font-size:13px;line-height:1.5;color:#52606d">
      ENINTI · Energía solar y mantención · Región de Antofagasta<br>
      Este es un aviso automático; no respondas este correo. ¿Dudas? Escríbenos a contacto@eninti.cl
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

// Mensaje de error legible: el proveedor explica qué falló (remitente no verificado, clave inválida...)
async function errorProveedor(nombre, res) {
  const cuerpo = await res.json().catch(() => null);
  const motivo = cuerpo?.message ?? cuerpo?.error ?? cuerpo?.name ?? '';
  return new Error(`${nombre} respondió ${res.status}${motivo ? `: ${motivo}` : ''}`);
}

async function enviarConProveedor({ para, asunto, texto, html }) {
  const de = remitente();
  if (modo() === 'brevo') {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.MAIL_API_KEY ?? '', 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: de, to: [{ email: para }], subject: asunto, textContent: texto, htmlContent: html }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw await errorProveedor('Brevo', res);
    return;
  }
  if (modo() === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.MAIL_API_KEY ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${de.name} <${de.email}>`, to: [para], subject: asunto, text: texto, html }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw await errorProveedor('Resend', res);
    return;
  }
  console.log(`\n✉  [correo:${modo()}] Para: ${para}\n   Asunto: ${asunto}\n   ${texto.replace(/\n/g, '\n   ')}\n`);
}

// Revisa la configuración al iniciar y devuelve las advertencias (también para el panel)
export function revisarConfiguracion() {
  const avisos = [];
  const m = modo();
  if (!MODOS.includes(m)) avisos.push(`MAIL_MODE="${m}" no es válido: usa consola, brevo o resend`);
  if (['brevo', 'resend'].includes(m) && !process.env.MAIL_API_KEY) avisos.push(`MAIL_MODE=${m} necesita MAIL_API_KEY`);
  if (['brevo', 'resend'].includes(m) && !process.env.MAIL_FROM) {
    avisos.push(`Define MAIL_FROM con un remitente verificado en ${m === 'brevo' ? 'Brevo' : 'Resend'} (el valor por defecto no lo está)`);
  }
  if (m === 'consola' && process.env.NODE_ENV === 'production') {
    avisos.push('MAIL_MODE=consola en producción: los correos no le llegan a nadie');
  }
  if (!process.env.APP_URL) avisos.push('Falta APP_URL: los enlaces de los correos no funcionarán');
  return avisos;
}

// Envía un aviso sin lanzar errores; devuelve true si salió
export async function enviarAviso(aviso) {
  return (await enviarYRegistrar(aviso)).estado === 'enviado';
}

// Correo de prueba desde el panel: confirma que el proveedor y el remitente funcionan
export async function enviarPrueba(para) {
  const r = await enviarYRegistrar({
    para,
    motivo: 'prueba',
    asunto: 'Correo de prueba de ENINTI',
    lineas: [
      'Hola:',
      `Si lees esto, los avisos de la plataforma ENINTI ya llegan por correo (proveedor: ${modo()}).`,
      'Revisa también que no haya caído en la carpeta de spam.',
    ],
    accion: { texto: 'Abrir ENINTI', url: `${appUrl()}/login` },
  });
  return { ...r, proveedor: modo(), para };
}

// Bitácora de los últimos avisos y resumen de los últimos 7 días para el panel
export async function bitacora(limite = 30) {
  const { rows: avisos } = await query(
    `SELECT id_aviso, destinatario, asunto, motivo, proveedor, estado, detalle, fecha_envio
     FROM aviso_correo ORDER BY fecha_envio DESC LIMIT $1`,
    [limite],
  );
  const { rows: [semana] } = await query(
    `SELECT count(*) FILTER (WHERE estado = 'enviado')::int AS enviados,
            count(*) FILTER (WHERE estado = 'fallido')::int AS fallidos
     FROM aviso_correo WHERE fecha_envio > now() - interval '7 days'`,
  );
  return { avisos, semana };
}

async function enviarYRegistrar({ para, asunto, lineas, motivo, accion }) {
  if (!para) return { estado: 'fallido', detalle: 'Sin destinatario' };
  const texto = [
    ...lineas,
    ...(accion ? ['', `${accion.texto}: ${accion.url}`] : []),
    '', 'ENINTI · Energía solar y mantención', 'Este es un aviso automático; no respondas este correo.',
  ].join('\n');
  const html = plantillaHtml({ asunto, lineas, accion });
  let estado = 'enviado';
  let detalle = null;
  try {
    await enviarConProveedor({ para, asunto, texto, html });
  } catch (err) {
    estado = 'fallido';
    detalle = (err.name === 'TimeoutError' ? 'El proveedor de correo no respondió a tiempo' : err.message).slice(0, 300);
    console.error(`Correo "${asunto}" a ${para}:`, detalle);
  }
  await query(
    `INSERT INTO aviso_correo (destinatario, asunto, motivo, proveedor, estado, detalle) VALUES ($1, $2, $3, $4, $5, $6)`,
    [para, asunto.slice(0, 200), motivo, modo(), estado, detalle],
  ).catch((err) => console.error('aviso_correo:', err.message));
  return { estado, detalle };
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
