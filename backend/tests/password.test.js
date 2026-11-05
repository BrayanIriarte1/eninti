import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verificarPassword } from '../src/shared/utils/password.js';

// RNF-10: contraseñas con scrypt y sal aleatoria
test('el hash guarda sal y verifica la contraseña correcta', async () => {
  const hash = await hashPassword('Secreta.2026');
  assert.match(hash, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.equal(await verificarPassword('Secreta.2026', hash), true);
});

test('rechaza una contraseña incorrecta', async () => {
  const hash = await hashPassword('Secreta.2026');
  assert.equal(await verificarPassword('otra-clave', hash), false);
});

test('dos hashes de la misma contraseña son distintos (sal aleatoria)', async () => {
  const a = await hashPassword('Secreta.2026');
  const b = await hashPassword('Secreta.2026');
  assert.notEqual(a, b);
});

test('un hash malformado no valida ni lanza error', async () => {
  assert.equal(await verificarPassword('Secreta.2026', 'pendiente-T09'), false);
  assert.equal(await verificarPassword('Secreta.2026', null), false);
});
