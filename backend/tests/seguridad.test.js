import { test } from 'node:test';
import assert from 'node:assert/strict';
import { celdaCsv, fechaHoraChile } from '../src/shared/utils/csv.js';
import { textoOpcional } from '../src/shared/utils/texto.js';
import { limitarPorIp } from '../src/shared/middlewares/limite.js';

test('CSV: una celda que parece fórmula queda como texto', () => {
  assert.equal(celdaCsv('=HYPERLINK("http://x")'), '"\'=HYPERLINK(""http://x"")"');
  assert.equal(celdaCsv('+56912345678'), '"\'+56912345678"');
  assert.equal(celdaCsv('@SUMA(A1)'), '"\'@SUMA(A1)"');
  assert.equal(celdaCsv('María González'), '"María González"');
  assert.equal(celdaCsv(15000), '"15000"');
  assert.equal(celdaCsv(null), '""');
});

test('CSV: la fecha del pago se escribe en hora de Chile aunque el servidor esté en UTC', () => {
  // 30-11-2026 a las 23:30 en Chile (UTC-3) es el 01-12-2026 02:30 UTC
  assert.match(fechaHoraChile('2026-12-01T02:30:00Z'), /^30-11-2026/);
});

test('textoOpcional: recorta, acepta vacío y rechaza lo que no es texto', () => {
  assert.equal(textoOpcional('  hola  ', 'campo'), 'hola');
  assert.equal(textoOpcional('   ', 'campo'), null);
  assert.equal(textoOpcional(undefined, 'campo'), null);
  assert.throws(() => textoOpcional(123, 'observaciones'), { status: 400, message: 'observaciones debe ser texto' });
  assert.throws(() => textoOpcional({ a: 1 }, 'comentario'), { status: 400 });
  assert.throws(() => textoOpcional('x'.repeat(256), 'comentario'), { status: 400 });
});

test('limitarPorIp: permite hasta el máximo y luego responde 429', () => {
  const limite = limitarPorIp({ maximo: 2, ventanaMs: 60_000, mensaje: 'Demasiadas' });
  const pasa = (ip) => { let ok = false; limite({ ip }, {}, () => { ok = true; }); return ok; };
  assert.equal(pasa('1.1.1.1'), true);
  assert.equal(pasa('1.1.1.1'), true);
  assert.throws(() => pasa('1.1.1.1'), { status: 429, message: 'Demasiadas' });
  assert.equal(pasa('2.2.2.2'), true, 'otra IP no se ve afectada');
});
