import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esCuotaMensual, CUOTA_MINIMA, MENSAJE_CUOTA } from '../src/shared/utils/cuota.js';

test('cuota mensual: acepta montos enteros desde el mínimo', () => {
  for (const v of [CUOTA_MINIMA, 15000, 39990, 10_000_000]) assert.equal(esCuotaMensual(v), true, String(v));
});

test('cuota mensual: rechaza montos simbólicos, decimales, texto y desbordes', () => {
  for (const v of [0, 1, 999, 15000.5, '15000', null, undefined, -15000, 10_000_001, Number.NaN]) {
    assert.equal(esCuotaMensual(v), false, String(v));
  }
  assert.match(MENSAJE_CUOTA, /\$1\.000/);
});
