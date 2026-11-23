import { test } from 'node:test';
import assert from 'node:assert/strict';
import { erroresContrasena, hashToken, ocultarCorreo } from '../src/modules/auth/contrasena.service.js';

// RNF-10: reglas de la contraseña nueva
test('acepta una contraseña de 8+ caracteres con letras y números', () => {
  assert.deepEqual(erroresContrasena('Solar2026'), []);
  assert.deepEqual(erroresContrasena('mantención 1'), []);
});

test('rechaza contraseñas cortas, sin números, sin letras o vacías', () => {
  assert.ok(erroresContrasena('Sol2026').some((e) => e.includes('al menos 8')));
  assert.ok(erroresContrasena('solamenteletras').some((e) => e.includes('letras y números')));
  assert.ok(erroresContrasena('1234567890').some((e) => e.includes('letras y números')));
  assert.equal(erroresContrasena(undefined).length, 1);
  assert.ok(erroresContrasena('a1'.repeat(65)).some((e) => e.includes('como máximo')));
});

// El enlace de recuperación se guarda solo como hash
test('el hash del token es SHA-256 hexadecimal y determinista', () => {
  const token = 'x'.repeat(43);
  assert.match(hashToken(token), /^[0-9a-f]{64}$/);
  assert.equal(hashToken(token), hashToken(token));
  assert.notEqual(hashToken(token), hashToken(`${token.slice(1)}y`));
});

test('el correo se muestra parcialmente oculto', () => {
  assert.equal(ocultarCorreo('maria.gonzalez@ejemplo.cl'), 'ma••••••••••••@ejemplo.cl');
  assert.equal(ocultarCorreo('al@eninti.cl'), 'a•••@eninti.cl');
  assert.equal(ocultarCorreo('sin-arroba'), '');
});
