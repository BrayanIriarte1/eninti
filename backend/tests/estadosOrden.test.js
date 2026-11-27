import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRANSICIONES, puedeTransitar, puedeTransitarTecnico } from '../src/shared/utils/estadosOrden.js';

// HU-16: pendiente → en_curso → por_confirmar → finalizada, sin saltos inválidos
test('una orden pendiente puede iniciarse o cancelarse', () => {
  assert.equal(puedeTransitar('pendiente', 'en_curso'), true);
  assert.equal(puedeTransitar('pendiente', 'cancelada'), true);
});

test('no se permite saltar de pendiente a finalizada', () => {
  assert.equal(puedeTransitar('pendiente', 'finalizada'), false);
  assert.equal(puedeTransitar('pendiente', 'por_confirmar'), false);
});

test('el técnico no finaliza: deja la orden por confirmar', () => {
  assert.equal(puedeTransitar('en_curso', 'por_confirmar'), true);
  assert.equal(puedeTransitar('en_curso', 'finalizada'), false);
  assert.equal(puedeTransitar('en_curso', 'cancelada'), true);
  assert.equal(puedeTransitar('en_curso', 'pendiente'), false);
});

test('el cliente confirma o reabre la orden', () => {
  assert.equal(puedeTransitar('por_confirmar', 'finalizada'), true);
  assert.equal(puedeTransitar('por_confirmar', 'en_curso'), true);
  assert.equal(puedeTransitar('por_confirmar', 'cancelada'), false);
});

test('el técnico no puede reabrir ni cerrar una orden por confirmar', () => {
  assert.equal(puedeTransitarTecnico('por_confirmar', 'en_curso'), false);
  assert.equal(puedeTransitarTecnico('por_confirmar', 'finalizada'), false);
  assert.equal(puedeTransitarTecnico('en_curso', 'por_confirmar'), true);
  assert.equal(puedeTransitarTecnico('pendiente', 'en_curso'), true);
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
