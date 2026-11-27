import * as finanzas from './finanzas.service.js';
import { parseId } from './plantas.controller.js';
import { celdaCsv, fechaHoraChile } from '../../shared/utils/csv.js';

export async function impagos(_req, res) {
  res.json(await finanzas.impagos());
}

export async function cuotasDeSuscripcion(req, res) {
  res.json(await finanzas.cuotasDeSuscripcion(parseId(req.params.id)));
}

export async function registrarPagoManual(req, res) {
  res.status(201).json(await finanzas.registrarPagoManual(parseId(req.params.id), req.body ?? {}, req.usuario.id));
}

// Listado mensual (HU-06). Con ?formato=csv descarga el archivo para el contador.
export async function pagosDelMes(req, res) {
  const pagos = await finanzas.pagosDelMes(req.query.periodo);
  if (req.query.formato !== 'csv') return res.json(pagos);

  const columnas = ['fecha_pago', 'cliente', 'rut', 'monto', 'origen', 'referencia', 'periodo', 'direccion'];
  const lineas = [
    columnas.join(';'),
    ...pagos.map((p) => columnas.map((c) => celdaCsv(c === 'fecha_pago' ? fechaHoraChile(p[c]) : p[c])).join(';')),
  ];

  res
    .set('Content-Type', 'text/csv; charset=utf-8')
    .set('Content-Disposition', `attachment; filename="pagos-${req.query.periodo}.csv"`)
    // BOM para que Excel reconozca las tildes
    .send('﻿' + lineas.join('\r\n'));
}

export async function generarCuotas(req, res) {
  res.json(await finanzas.generarCuotas(req.body ?? {}));
}

export async function procesarCargos(_req, res) {
  res.json(await finanzas.procesarCargos());
}
