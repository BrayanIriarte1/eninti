import { test } from 'node:test';
import assert from 'node:assert/strict';
import { digitoVerificador, normalizarRut, rutValido, telefonoValido } from '../src/shared/utils/rut.js';

test('calcula el dígito verificador (módulo 11)', () => {
  assert.equal(digitoVerificador('11111111'), '1');
  assert.equal(digitoVerificador('12345678'), '5');
  assert.equal(digitoVerificador('10000013'), 'K');
});

test('normaliza el RUT: sin puntos, con guion y K mayúscula', () => {
  assert.equal(normalizarRut('12.345.678-5'), '12345678-5');
  assert.equal(normalizarRut('123456785'), '12345678-5');
  assert.equal(normalizarRut('10000013k'), '10000013-K');
});

test('acepta RUT con dígito correcto y rechaza los inválidos', () => {
  assert.equal(rutValido('12345678-5'), true);
  assert.equal(rutValido('55555555-5'), true);
  assert.equal(rutValido('12345678-9'), false);
  assert.equal(rutValido('123-4'), false);
  assert.equal(rutValido(''), false);
});

test('el teléfono debe incluir el código de país', () => {
  assert.equal(telefonoValido('+56912345678'), true);
  assert.equal(telefonoValido('912345678'), false);
  assert.equal(telefonoValido('+56 9'), false);
});
