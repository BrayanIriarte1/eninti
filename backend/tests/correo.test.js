import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plantillaHtml, revisarConfiguracion } from '../src/modules/notificaciones/correo.service.js';

test('la plantilla escapa el texto y convierte las URL en enlaces', () => {
  const html = plantillaHtml({ asunto: 'Prueba', lineas: ['Hola <b>María</b>', 'Mira https://eninti.cl/cliente/cuenta'] });
  assert.ok(html.includes('Hola &#60;b&#62;María&#60;/b&#62;'), 'el HTML del texto se escapa');
  assert.ok(html.includes('<a href="https://eninti.cl/cliente/cuenta"'), 'la URL es un enlace');
  assert.ok(html.includes('ENINTI'));
});

test('la acción se muestra como botón y como enlace de respaldo', () => {
  const html = plantillaHtml({ asunto: 'x', lineas: ['Hola'], accion: { texto: 'Crear contraseña nueva', url: 'https://eninti.cl/restablecer?token=abc' } });
  assert.ok(html.includes('>Crear contraseña nueva</a>'));
  assert.equal(html.split('https://eninti.cl/restablecer?token=abc').length - 1 >= 2, true);
});

function conEntorno(valores, fn) {
  const antes = {};
  for (const k of Object.keys(valores)) {
    antes[k] = process.env[k];
    if (valores[k] === undefined) delete process.env[k]; else process.env[k] = valores[k];
  }
  try { return fn(); } finally {
    for (const k of Object.keys(antes)) if (antes[k] === undefined) delete process.env[k]; else process.env[k] = antes[k];
  }
}

test('advierte si el proveedor no tiene clave ni remitente', () => {
  const avisos = conEntorno({ MAIL_MODE: 'brevo', MAIL_API_KEY: undefined, MAIL_FROM: undefined, APP_URL: 'http://x' }, revisarConfiguracion);
  assert.ok(avisos.some((a) => a.includes('MAIL_API_KEY')));
  assert.ok(avisos.some((a) => a.includes('MAIL_FROM')));
});

test('sin advertencias con una configuración completa', () => {
  const avisos = conEntorno(
    { MAIL_MODE: 'brevo', MAIL_API_KEY: 'clave', MAIL_FROM: 'ENINTI <a@b.cl>', APP_URL: 'https://eninti.cl', NODE_ENV: 'production' },
    revisarConfiguracion,
  );
  assert.deepEqual(avisos, []);
});

test('advierte un modo inválido y la consola en producción', () => {
  assert.ok(conEntorno({ MAIL_MODE: 'gmail', APP_URL: 'x' }, revisarConfiguracion).some((a) => a.includes('no es válido')));
  assert.ok(conEntorno({ MAIL_MODE: 'consola', NODE_ENV: 'production', APP_URL: 'x' }, revisarConfiguracion).some((a) => a.includes('producción')));
});
