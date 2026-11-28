import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mismaDireccion, validarSolicitudPlanta } from '../src/shared/utils/solicitudPlanta.js';

const base = { id_comuna: 2, direccion: '  Calle   Los Aromos 123 ' };

test('CU-36: una solicitud mínima válida se limpia y completa con null', () => {
  assert.deepEqual(validarSolicitudPlanta(base), {
    id_comuna: 2, direccion: 'Calle Los Aromos 123', potencia_kw: null, tiene_baterias: null, mensaje: null,
  });
});

test('CU-36: acepta potencia, baterías y mensaje opcionales', () => {
  const r = validarSolicitudPlanta({ ...base, potencia_kw: 5.5, tiene_baterias: false, mensaje: ' Inversor Huawei ' });
  assert.equal(r.potencia_kw, 5.5);
  assert.equal(r.tiene_baterias, false);
  assert.equal(r.mensaje, 'Inversor Huawei');
});

test('CU-36: rechaza comuna y dirección faltantes o inválidas con la lista de errores', () => {
  assert.throws(() => validarSolicitudPlanta({}), (e) => e.status === 400 && e.details.length === 2);
  assert.throws(() => validarSolicitudPlanta({ ...base, id_comuna: '2' }), { status: 400 });
  assert.throws(() => validarSolicitudPlanta({ ...base, id_comuna: 0 }), { status: 400 });
  assert.throws(() => validarSolicitudPlanta({ ...base, direccion: 'abc' }), { status: 400 });
  assert.throws(() => validarSolicitudPlanta({ ...base, direccion: 'x'.repeat(201) }), { status: 400 });
  assert.throws(() => validarSolicitudPlanta({ ...base, direccion: { a: 1 } }), { status: 400 });
});

test('CU-36: rechaza potencia, baterías y mensaje con tipo o rango incorrecto', () => {
  for (const potencia_kw of [0, -1, '5', 10000, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => validarSolicitudPlanta({ ...base, potencia_kw }), { status: 400 }, `potencia ${potencia_kw}`);
  }
  assert.throws(() => validarSolicitudPlanta({ ...base, tiene_baterias: 'si' }), { status: 400 });
  assert.throws(() => validarSolicitudPlanta({ ...base, mensaje: 123 }), { status: 400 });
  assert.throws(() => validarSolicitudPlanta({ ...base, mensaje: 'x'.repeat(501) }), { status: 400 });
});

test('CU-36: la comparación de direcciones ignora mayúsculas y espacios repetidos', () => {
  assert.equal(mismaDireccion('Calle Los Aromos 123', '  calle  los aromos 123'), true);
  assert.equal(mismaDireccion('Calle Los Aromos 123', 'Calle Los Aromos 124'), false);
});
