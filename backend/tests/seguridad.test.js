import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoOpcional } from '../src/shared/utils/texto.js';
import { limitarTasa } from '../src/shared/middlewares/seguridad.js';

test('textoOpcional: recorta, acepta vacío y rechaza lo que no es texto', () => {
  assert.equal(textoOpcional('  hola  ', 'campo'), 'hola');
  assert.equal(textoOpcional('   ', 'campo'), null);
  assert.equal(textoOpcional(undefined, 'campo'), null);
  assert.throws(() => textoOpcional(123, 'observaciones'), { status: 400, message: 'observaciones debe ser texto' });
  assert.throws(() => textoOpcional({ a: 1 }, 'comentario'), { status: 400 });
  assert.throws(() => textoOpcional('x'.repeat(256), 'comentario'), { status: 400 });
});

test('limitarTasa: permite hasta el máximo y luego responde 429', () => {
  const limite = limitarTasa({ maximo: 2, ventanaMs: 60_000, mensaje: 'Demasiadas' });
  const pasa = (ip) => { let ok = false; limite({ ip }, {}, () => { ok = true; }); return ok; };
  assert.equal(pasa('1.1.1.1'), true);
  assert.equal(pasa('1.1.1.1'), true);
  assert.throws(() => pasa('1.1.1.1'), { status: 429, message: 'Demasiadas' });
  assert.equal(pasa('2.2.2.2'), true, 'otra IP no se ve afectada');
});

test('parseId: acepta enteros positivos dentro del rango de INTEGER y rechaza el resto', async () => {
  const { parseId } = await import('../src/shared/utils/ids.js');
  assert.equal(parseId('42'), 42);
  assert.equal(parseId('2147483647'), 2147483647);
  for (const malo of ['99999999999', '2147483648', '0', '-1', '1.5', 'abc', '', undefined]) {
    assert.throws(() => parseId(malo), { status: 400 }, `debería rechazar ${malo}`);
  }
});
