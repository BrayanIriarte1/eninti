import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { miCuenta, cancelarSuscripcion, iniciarInscripcion } from '../services/clienteService.js';
import EstadoSuscripcion from '../../administrador/components/EstadoSuscripcion.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoPesos, formatoFecha } from '../../../shared/utils/formato.js';

// Mi Cuenta: pagos, deuda e historial en pocas acciones (HU-08, RNF-01).
// Incluye inscribir medio de pago (HU-13) y cancelar suscripción (HU-12).
export default function CuentaPage() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [accion, setAccion] = useState(null); // id de suscripción en proceso

  const cargar = useCallback(() => miCuenta().then(setDatos).catch(setError), []);
  useEffect(() => { cargar(); }, [cargar]);

  async function inscribir(idSuscripcion) {
    setAccion(idSuscripcion);
    setError(null);
    try {
      const { url_pasarela } = await iniciarInscripcion(idSuscripcion, {
        acepta_condiciones: true,
        version_condiciones: '1.0',
      });
      // En modo simulado la URL es una ruta interna; en sandbox sería del proveedor
      if (url_pasarela.startsWith('/')) navigate(url_pasarela);
      else window.location.assign(url_pasarela);
    } catch (err) {
      setError(err);
      setAccion(null);
    }
  }

  async function cancelar(idSuscripcion) {
    if (!window.confirm('¿Cancelar esta suscripción? No se puede deshacer.')) return;
    setAccion(idSuscripcion);
    setError(null);
    try {
      await cancelarSuscripcion(idSuscripcion);
      await cargar();
    } catch (err) {
      setError(err);
    } finally {
      setAccion(null);
    }
  }

  if (error && !datos) return <Mensaje error={error} />;
  if (!datos) return <p>Cargando…</p>;

  const { suscripciones, deuda_total, cuotas_pendientes, pagos, medio_pago } = datos;

  return (
    <section>
      <h1>Mi cuenta</h1>

      <div className="resumen-tiras">
        <div className={`tira ${deuda_total > 0 ? 'tira-alerta' : 'tira-ok'}`}>
          <span className="tira-valor">{deuda_total > 0 ? formatoPesos(deuda_total) : 'Sin deuda'}</span>
          <span className="tira-texto">Deuda vigente</span>
        </div>
        <div className="tira">
          <span className="tira-valor">{suscripciones.filter((s) => s.estado !== 'cancelada').length}</span>
          <span className="tira-texto">Suscripciones activas</span>
        </div>
        <div className="tira">
          <span className="tira-valor">
            {medio_pago ? `•••• ${medio_pago.ultimos_4}` : 'Sin inscribir'}
          </span>
          <span className="tira-texto">Medio de pago</span>
        </div>
      </div>

      <Mensaje error={error} />

      <h2>Mis suscripciones</h2>
      <div className="columnas">
        {suscripciones.map((s) => (
          <article key={s.id_suscripcion} className="tarjeta">
            <div className="encabezado">
              <h3 style={{ margin: 0 }}>{s.direccion}</h3>
              <EstadoSuscripcion estado={s.estado} />
            </div>
            <dl className="ficha">
              <div><dt>Comuna</dt><dd>{s.comuna}</dd></div>
              <div><dt>Cuota mensual</dt><dd>{formatoPesos(s.monto_mensual)}</dd></div>
              <div><dt>Meses pagados</dt><dd>{s.meses_pagados}</dd></div>
              <div><dt>Cuotas vencidas</dt><dd>{s.cuotas_vencidas}</dd></div>
              {s.deuda > 0 && <div><dt>Deuda</dt><dd>{formatoPesos(s.deuda)}</dd></div>}
            </dl>
            {s.estado !== 'cancelada' && (
              <div className="acciones">
                {!medio_pago && (
                  <button className="boton" disabled={accion === s.id_suscripcion} onClick={() => inscribir(s.id_suscripcion)}>
                    Inscribir medio de pago
                  </button>
                )}
                <button className="boton peligro" disabled={accion === s.id_suscripcion} onClick={() => cancelar(s.id_suscripcion)}>
                  Cancelar
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      {cuotas_pendientes.length > 0 && (
        <>
          <h2>Cuotas por pagar</h2>
          <table className="tabla">
            <thead>
              <tr><th>Período</th><th>Planta</th><th>Monto</th><th>Vence</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {cuotas_pendientes.map((c, i) => (
                <tr key={i}>
                  <td data-label="Período">{c.periodo}</td>
                  <td data-label="Planta">{c.direccion}</td>
                  <td data-label="Monto">{formatoPesos(c.monto)}</td>
                  <td data-label="Vence">{formatoFecha(c.fecha_vencimiento)}</td>
                  <td data-label="Estado">
                    <span className={`etiqueta ${c.estado === 'vencida' ? 'alerta' : 'neutro'}`}>{c.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>Historial de pagos</h2>
      {pagos.length === 0 ? (
        <p>Aún no hay pagos registrados.</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr><th>Fecha</th><th>Período</th><th>Planta</th><th>Monto</th><th>Origen</th></tr>
          </thead>
          <tbody>
            {pagos.map((p, i) => (
              <tr key={i}>
                <td data-label="Fecha">{new Date(p.fecha_pago).toLocaleDateString('es-CL')}</td>
                <td data-label="Período">{p.periodo}</td>
                <td data-label="Planta">{p.direccion}</td>
                <td data-label="Monto">{formatoPesos(p.monto)}</td>
                <td data-label="Origen">{p.origen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
