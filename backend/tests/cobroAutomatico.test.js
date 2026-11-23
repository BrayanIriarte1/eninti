import { test } from 'node:test';
import assert from 'node:assert/strict';
import { horaCobro, horaLocal, tocaEjecutar } from '../src/modules/pagos/cobroAutomatico.js';

// HU-13: la tarea diaria corre una vez al día desde la hora de cobro (hora de Chile)
test('ejecuta desde la hora de cobro si hoy no terminó', () => {
  assert.equal(tocaEjecutar({ hora: 9, hoyListo: false, horaDeCobro: 9 }), true);
  assert.equal(tocaEjecutar({ hora: 23, hoyListo: false, horaDeCobro: 9 }), true);
});

test('no ejecuta antes de la hora ni dos veces el mismo día', () => {
  assert.equal(tocaEjecutar({ hora: 8, hoyListo: false, horaDeCobro: 9 }), false);
  assert.equal(tocaEjecutar({ hora: 12, hoyListo: true, horaDeCobro: 9 }), false);
});

test('la hora local se calcula en la zona de Chile', () => {
  // 12:00 UTC del 15 de enero = 9:00 en Chile (verano, UTC-3)
  assert.equal(horaLocal(new Date('2026-01-15T12:00:00Z')), 9);
  // 12:00 UTC del 15 de julio = 8:00 en Chile (invierno, UTC-4)
  assert.equal(horaLocal(new Date('2026-07-15T12:00:00Z')), 8);
});

test('COBRO_HORA inválida vuelve a las 9', () => {
  const antes = process.env.COBRO_HORA;
  process.env.COBRO_HORA = '25';
  assert.equal(horaCobro(), 9);
  process.env.COBRO_HORA = '6';
  assert.equal(horaCobro(), 6);
  if (antes === undefined) delete process.env.COBRO_HORA; else process.env.COBRO_HORA = antes;
});
