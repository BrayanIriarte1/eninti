import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRANSICIONES, puedeTransitar } from '../src/shared/utils/estadosOrden.js';

// HU-16: pendiente → en_curso → finalizada, sin saltos inválidos
test('una orden pendiente puede iniciarse o cancelarse', () => {
  assert.equal(puedeTransitar('pendiente', 'en_curso'), true);
  assert.equal(puedeTransitar('pendiente', 'cancelada'), true);
});

test('no se permite saltar de pendiente a finalizada', () => {
  assert.equal(puedeTransitar('pendiente', 'finalizada'), false);
});

test('una orden en curso solo puede finalizarse o cancelarse', () => {
  assert.equal(puedeTransitar('en_curso', 'finalizada'), true);
  assert.equal(puedeTransitar('en_curso', 'cancelada'), true);
  assert.equal(puedeTransitar('en_curso', 'pendiente'), false);
});

test('los estados finales no admiten transiciones', () => {
  for (const destino of Object.keys(TRANSICIONES)) {
    assert.equal(puedeTransitar('finalizada', destino), false);
    assert.equal(puedeTransitar('cancelada', destino), false);
  }
});

test('un estado desconocido no transita a ninguna parte', () => {
  assert.equal(puedeTransitar('inexistente', 'en_curso'), false);
});
