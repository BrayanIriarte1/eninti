// CU-37 · Campana de notificaciones: quién recibe cada aviso y aislamiento entre usuarios
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar, query, CORREOS, FOTO } from './apoyo.js';

let api, ADMIN, MARIA, LUIS, PEDRO, idPedro, idComuna, idOrden;
const campana = async (t) => (await api.pedir('GET', '/notificaciones', t)).json;
// Los avisos se registran después de responder: se da un instante antes de leerlos
const espera = () => new Promise((r) => setTimeout(r, 150));

before(async () => {
  api = await iniciar();
  [ADMIN, MARIA, LUIS, PEDRO] = await Promise.all([CORREOS.admin, CORREOS.maria, CORREOS.luis, CORREOS.pedro].map(api.tokenDe));
  idPedro = (await query('SELECT id_usuario FROM usuario WHERE email = $1', [CORREOS.pedro])).rows[0].id_usuario;
  idComuna = (await query(`SELECT id_comuna FROM comuna WHERE nombre = 'Calama'`)).rows[0].id_comuna;
  await query('DELETE FROM notificacion');
});
after(() => api.cerrar());

test('sin sesión responde 401', async () => {
  assert.equal((await api.pedir('GET', '/notificaciones')).status, 401);
});

test('una solicitud del cliente avisa a todos los administradores activos', async () => {
  const r = await api.pedir('POST', '/cliente/solicitudes-planta', MARIA, { id_comuna: idComuna, direccion: 'Parcela 9, Chiu Chiu', potencia_kw: 4 });
  await espera();
  const admins = (await query(`SELECT count(*)::int n FROM usuario WHERE rol = 'administrador' AND activo`)).rows[0].n;
  const avisos = (await query(`SELECT count(*)::int n FROM notificacion WHERE tipo = 'solicitud_planta'`)).rows[0].n;
  assert.equal(avisos, admins);
  const c = await campana(ADMIN);
  assert.equal(c.no_leidas, 1);
  assert.equal(c.notificaciones[0].ruta, '/admin/solicitudes-planta');

  await api.pedir('POST', `/admin/solicitudes-planta/${r.json.id_solicitud_planta}/aprobar`, ADMIN,
    { inversor: 'Huawei', paneles: '8 x 450 W', fecha_instalacion: '2026-11-01' });
  await espera();
  assert.ok((await campana(MARIA)).notificaciones.some((n) => n.tipo === 'planta_aprobada'));
});

test('cada usuario ve y marca solo sus avisos', async () => {
  const deMaria = (await campana(MARIA)).notificaciones[0].id_notificacion;
  assert.deepEqual((await campana(LUIS)).notificaciones, []);
  assert.equal((await api.pedir('POST', `/notificaciones/${deMaria}/leer`, LUIS)).status, 404);
  assert.equal((await api.pedir('POST', '/notificaciones/abc/leer', MARIA)).status, 400);
});

test('programar una orden avisa al técnico asignado y al cliente', async () => {
  const { rows: [planta] } = await query(`SELECT p.id_planta FROM planta p JOIN cliente c USING (id_cliente) JOIN usuario u USING (id_usuario)
    WHERE u.email = $1 ORDER BY p.id_planta DESC LIMIT 1`, [CORREOS.maria]);
  const r = await api.pedir('POST', '/admin/mantenciones', ADMIN, { id_planta: planta.id_planta, tipo: 'correctiva', fecha_programada: '2026-12-02', id_trabajador: idPedro });
  assert.equal(r.status, 201);
  idOrden = r.json.id_mantencion;
  await espera();
  const tecnico = (await campana(PEDRO)).notificaciones[0];
  assert.equal(tecnico.tipo, 'orden_asignada');
  assert.equal(tecnico.ruta, `/trabajador/ordenes/${idOrden}`);
  assert.equal((await campana(MARIA)).notificaciones[0].tipo, 'mantencion_programada');
});

test('el técnico inicia y termina: avisa a los administradores y el cliente debe confirmar', async () => {
  await query('UPDATE notificacion SET leida_en = now()');
  assert.equal((await api.pedir('POST', `/trabajador/ordenes/${idOrden}/estado`, PEDRO, { estado: 'en_curso' })).status, 200);
  await espera();
  assert.equal((await campana(ADMIN)).no_leidas, 1);
  const fin = await api.pedir('POST', `/trabajador/ordenes/${idOrden}/estado`, PEDRO,
    { estado: 'por_confirmar', actividades: 'Limpieza de paneles y revisión del inversor', fotos: [FOTO] });
  assert.equal(fin.status, 200);
  await espera();
  assert.equal((await campana(ADMIN)).no_leidas, 2);
  const cliente = await campana(MARIA);
  assert.equal(cliente.no_leidas, 1);
  assert.equal(cliente.notificaciones[0].tipo, 'orden_por_confirmar');
});

test('marcar una y marcar todas como leídas', async () => {
  const id = (await campana(MARIA)).notificaciones[0].id_notificacion;
  assert.equal((await api.pedir('POST', `/notificaciones/${id}/leer`, MARIA)).status, 200);
  assert.equal((await campana(MARIA)).no_leidas, 0);
  assert.equal((await api.pedir('POST', '/notificaciones/leer-todas', ADMIN)).status, 200);
  const c = await campana(ADMIN);
  assert.equal(c.no_leidas, 0);
  assert.ok(c.notificaciones.length >= 3);
});
