import { useCallback, useEffect, useState } from 'react';
import { listarImpagos, cuotasDeSuscripcion, registrarPagoManual } from '../services/adminService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoPesos, formatoFecha } from '../../../shared/utils/formato.js';

// Listado de impagos con registro manual de pagos (HU-01, HU-02)
export default function ImpagosPage() {
  const [impagos, setImpagos] = useState([]);
  const [error, setError] = useState(null);
  const [detalle, setDetalle] = useState(null); // { suscripcion, cuotas }
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(() => listarImpagos().then(setImpagos).catch(setError), []);
  useEffect(() => { cargar(); }, [cargar]);

  async function abrir(imp) {
    setError(null);
    try {
      const cuotas = await cuotasDeSuscripcion(imp.id_suscripcion);
      setDetalle({ imp, cuotas });
    } catch (err) { setError(err); }
  }

  async function pagar(idCuota, origen) {
    setEnviando(true);
    setError(null);
    try {
      const referencia = window.prompt('Referencia del pago (N° de transferencia, folio, etc.):') ?? '';
      await registrarPagoManual(idCuota, { origen, referencia: referencia.trim() || undefined });
      const cuotas = await cuotasDeSuscripcion(detalle.imp.id_suscripcion);
      setDetalle({ ...detalle, cuotas });
      await cargar();
    } catch (err) { setError(err); } finally { setEnviando(false); }
  }

  return (
    <section>
      <h1>Impagos y morosidad</h1>
      <Mensaje error={error} />

      {impagos.length === 0 && <p>No hay suscripciones con cuotas vencidas. 🎉</p>}

      {impagos.length > 0 && (
        <table className="tabla">
          <thead>
            <tr><th>Cliente</th><th>Planta</th><th>Comuna</th><th>Meses</th><th>Deuda</th><th>Desde</th><th>Contacto</th><th></th></tr>
          </thead>
          <tbody>
            {impagos.map((i) => (
              <tr key={i.id_suscripcion}>
                <td data-label="Cliente">{i.cliente}<br /><span className="texto-suave">{i.rut}</span></td>
                <td data-label="Planta">{i.direccion}</td>
                <td data-label="Comuna">{i.comuna}</td>
                <td data-label="Meses">{i.meses_adeudados}</td>
                <td data-label="Deuda">{formatoPesos(i.monto_total)}</td>
                <td data-label="Desde">{formatoFecha(i.vencida_desde)}</td>
                <td data-label="Contacto">
                  {i.telefono && (
                    <>
                      <a href={`https://wa.me/${i.telefono.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>
                      {' · '}<a href={`tel:${i.telefono}`}>Llamar</a>
                    </>
                  )}
                </td>
                <td data-label=""><button className="boton secundario" onClick={() => abrir(i)}>Ver cuotas</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {detalle && (
        <article className="tarjeta" style={{ marginTop: '1.5rem' }}>
          <div className="encabezado">
            <h2 style={{ margin: 0 }}>Cuotas · {detalle.imp.cliente} · {detalle.imp.direccion}</h2>
            <button className="boton secundario" onClick={() => setDetalle(null)}>Cerrar</button>
          </div>
          <table className="tabla">
            <thead>
              <tr><th>Período</th><th>Monto</th><th>Vence</th><th>Estado</th><th>Registrar pago</th></tr>
            </thead>
            <tbody>
              {detalle.cuotas.map((c) => (
                <tr key={c.id_cuota}>
                  <td data-label="Período">{c.periodo}</td>
                  <td data-label="Monto">{formatoPesos(c.monto)}</td>
                  <td data-label="Vence">{formatoFecha(c.fecha_vencimiento)}</td>
                  <td data-label="Estado">
                    <span className={`etiqueta ${c.estado === 'pagada' ? 'ok' : c.estado === 'vencida' ? 'alerta' : 'neutro'}`}>{c.estado}</span>
                  </td>
                  <td data-label="Registrar pago">
                    {['pendiente', 'vencida'].includes(c.estado) ? (
                      <div className="acciones" style={{ margin: 0 }}>
                        <button className="boton secundario" disabled={enviando} onClick={() => pagar(c.id_cuota, 'transferencia')}>Transferencia</button>
                        <button className="boton secundario" disabled={enviando} onClick={() => pagar(c.id_cuota, 'efectivo')}>Efectivo</button>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      )}
    </section>
  );
}
