import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { cobrar, firmarParams } from '../src/modules/pagos/pasarela.service.js';

// HU-13 / RNF-03: firma de Flow y cobro en la pasarela simulada
test('la firma de Flow ordena los parámetros y usa HMAC-SHA256', () => {
  const esperado = createHmac('sha256', 'secreto').update('amount5000apiKeyABCcurrencyCLP').digest('hex');
  assert.equal(firmarParams({ currency: 'CLP', apiKey: 'ABC', amount: 5000 }, 'secreto'), esperado);
});

test('la pasarela simulada aprueba una tarjeta normal', async () => {
  const r = await cobrar({ medioPago: { ultimos_4: '4242' }, monto: 15000, descripcion: 'x', idCuota: 1 });
  assert.equal(r.estado, 'aprobado');
  assert.match(r.referencia, /^SIM-/);
});

test('la tarjeta de prueba 0002 se rechaza al cobrar', async () => {
  const r = await cobrar({ medioPago: { ultimos_4: '0002' }, monto: 15000, descripcion: 'x', idCuota: 1 });
  assert.equal(r.estado, 'rechazado');
});
