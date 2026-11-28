// CU-18, CU-20, CU-34 · Regla de cancelación por morosidad: no se cancela una suscripción
// con tarjeta activa antes de intentar cobrarla.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { query, pool } from '../../src/config/db.js';
import { aplicarReglasDeuda } from '../../src/modules/pagos/reglasDeuda.js';
import { procesarCargos } from '../../src/modules/administrador/finanzas.service.js';

const estado = async (id) => (await query('SELECT estado, motivo_cancelacion FROM suscripcion WHERE id_suscripcion = $1', [id])).rows[0];
let n = 0;

// Cliente con una suscripción vigente y una cuota vencida hace 45 días; tarjeta opcional
async function preparar(nombre, tarjeta) {
  n += 1;
  const { rows: [c] } = await query(
    `INSERT INTO cliente (rut, nombre, telefono, direccion, id_comuna) VALUES ($1, $2, '+56900000000', 'Calle 1', 2) RETURNING id_cliente`,
    [`${20000000 + n}-${n % 10}`, nombre]);
  const { rows: [p] } = await query(
    `INSERT INTO planta (id_cliente, id_comuna, direccion, potencia_kw, inversor, paneles, fecha_instalacion)
     VALUES ($1, 2, $2, 3, 'X', 'Y', '2025-01-01') RETURNING id_planta`, [c.id_cliente, `Dir ${nombre}`]);
  const { rows: [s] } = await query(
    `INSERT INTO suscripcion (id_planta, monto_mensual, fecha_inicio, dia_cobro) VALUES ($1, 15000, '2025-01-01', 5) RETURNING id_suscripcion`, [p.id_planta]);
  const { rows: [q] } = await query(
    `INSERT INTO cuota (id_suscripcion, periodo, monto, fecha_vencimiento, estado)
     VALUES ($1, '2026-10', 15000, CURRENT_DATE - 45, 'vencida') RETURNING id_cuota`, [s.id_suscripcion]);
  const mp = tarjeta ? (await query(
    `INSERT INTO medio_pago (id_cliente, token_pasarela, marca, ultimos_4, estado) VALUES ($1, $2, 'Visa', $3, 'activo') RETURNING id_medio_pago`,
    [c.id_cliente, `tok-${nombre}`, tarjeta])).rows[0].id_medio_pago : null;
  return { s: s.id_suscripcion, cuota: q.id_cuota, mp };
}

let A, B, C, D;
before(async () => {
  // Se aíslan los escenarios: las suscripciones de los datos de prueba no participan
  await query(`UPDATE suscripcion SET estado = 'cancelada', motivo_cancelacion = 'administrador', fecha_cancelacion = CURRENT_DATE WHERE estado <> 'cancelada'`);
  A = await preparar('ConTarjetaSinIntento', '4242'); // la pasarela simulada aprueba
  B = await preparar('ConTarjetaRechazada', '0002');  // la pasarela simulada rechaza
  C = await preparar('SinTarjeta', null);
  D = await preparar('CobroEnEspera', '4243');
  await query(`INSERT INTO intento_cargo (id_cuota, id_medio_pago, monto, resultado, referencia, origen) VALUES ($1, $2, 15000, 'pendiente', 'REF', 'manual')`, [D.cuota, D.mp]);
});
after(() => pool.end());

test('antes del cobro: solo se cancela la suscripción sin tarjeta', async () => {
  await aplicarReglasDeuda();
  assert.equal((await estado(A.s)).estado, 'con_deuda');
  assert.equal((await estado(B.s)).estado, 'con_deuda');
  assert.equal((await estado(C.s)).motivo_cancelacion, 'morosidad');
  assert.equal((await estado(D.s)).estado, 'con_deuda');
});

test('tras el cobro: la aprobada queda al día y la rechazada se cancela', async () => {
  await procesarCargos({ origen: 'manual' });
  assert.equal((await estado(A.s)).estado, 'al_dia');
  assert.equal((await estado(B.s)).motivo_cancelacion, 'morosidad');
  assert.equal((await estado(D.s)).estado, 'con_deuda', 'un cobro en espera no se reintenta ni se cancela');
});

test('descartado el cobro en espera, corresponde cancelar', async () => {
  await query(`UPDATE intento_cargo SET resultado = 'descartado' WHERE id_cuota = $1`, [D.cuota]);
  await aplicarReglasDeuda();
  assert.equal((await estado(D.s)).motivo_cancelacion, 'morosidad');
});
