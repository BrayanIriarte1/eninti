// ============================================================================
// PANTALLA: Impagos · URL /admin/impagos · Rol: administrador
// Casos de uso: CU-18 consultar impagos · CU-22 registrar pago manual
// Datos: listarImpagos(), cuotasDeSuscripcion(), registrarPagoManual() → finanzas.service.js
// Patrón: useState (datos/error) → cargar() pide a la API → render. Tras guardar, se vuelve a cargar().
// Los textos que ves en pantalla están en el JSX de abajo; las reglas están en el backend.
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { listarImpagos, cuotasDeSuscripcion, registrarPagoManual } from '../services/adminService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoPesos, formatoFecha } from '../../../shared/utils/formato.js';
import ConfirmarPagoDialogo from '../components/ConfirmarPagoDialogo.jsx';

// Listado de impagos con registro manual de pagos (HU-01, HU-02)
export default function ImpagosPage() {
  const [impagos, setImpagos] = useState([]);
  const [error, setError] = useState(null);
  const [detalle, setDetalle] = useState(null); // { suscripcion, cuotas }
  const [pago, setPago] = useState(null); // pago por confirmar: { cuota, origen, cliente, direccion }
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(() => listarImpagos().then(setImpagos).catch(setError), []);
  useEffect(() => { cargar(); }, [cargar]);

  // [CU-18 → CU-22] Muestra las cuotas de la suscripción morosa.
  async function abrir(imp) {
    setError(null);
    try {
      const cuotas = await cuotasDeSuscripcion(imp.id_suscripcion);
      setDetalle({ imp, cuotas });
    } catch (err) { setError(err); }
  }

  // [CU-22] Abre el diálogo de confirmación del pago.
  // Abre la confirmación: el pago NO se registra hasta presionar «Registrar pago»
  function pedirConfirmacion(cuota, origen) {
    setError(null);
    setAviso(null);
    setPago({ cuota, origen, cliente: detalle.imp.cliente, direccion: detalle.imp.direccion });
  }

  // [CU-22]
  // Lo llama el diálogo; si la API falla, el error se muestra dentro del diálogo
  async function registrar(referencia) {
    const { cuota, origen } = pago;
    await registrarPagoManual(cuota.id_cuota, { origen, monto: cuota.monto, referencia });
    setPago(null);
    setAviso(`Pago de ${formatoPesos(cuota.monto)} (${cuota.periodo}) registrado por ${origen}.`);
    const cuotas = await cuotasDeSuscripcion(detalle.imp.id_suscripcion);
    setDetalle({ ...detalle, cuotas });
    await cargar();
  }

  return (
    <section>
      <h1>Impagos y morosidad</h1>
      <Mensaje error={error} />
      {aviso && <p className="mensaje-ok" role="status">{aviso}</p>}
      {pago && <ConfirmarPagoDialogo pago={pago} onConfirmar={registrar} onCerrar={() => setPago(null)} />}

      {impagos.length === 0 && <p>No hay cuotas vencidas: todos los clientes están al día.</p>}

      {impagos.length > 0 && (
        <table className="tabla">
          <thead>
            <tr><th>Cliente</th><th>Planta</th><th>Comuna</th><th>Meses</th><th>Deuda</th><th>Desde</th><th>Contacto</th><th></th></tr>
          </thead>
          <tbody>
            {impagos.map((i) => (
              <tr key={i.id_suscripcion}>
                <td data-label="Cliente">{i.cliente}<br /><span className="texto-suave">{i.rut}</span>{i.estado_suscripcion === 'cancelada' && <><br /><span className="etiqueta neutro">Cancelada por deuda</span></>}<br /><span className="texto-suave" style={{ fontSize: '.8rem' }}>{i.tiene_cuenta ? (i.tiene_tarjeta ? 'Con cuenta web y tarjeta' : 'Con cuenta web, sin tarjeta') : 'Sin cuenta web: paga por transferencia o efectivo'}</span></td>
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
                        <button className="boton secundario" onClick={() => pedirConfirmacion(c, 'transferencia')}>Transferencia</button>
                        <button className="boton secundario" onClick={() => pedirConfirmacion(c, 'efectivo')}>Efectivo</button>
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
