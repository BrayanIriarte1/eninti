import { useEffect, useState } from 'react';
import { pagosDelMes, generarCuotas, procesarCargos } from '../services/adminService.js';
import { leerToken } from '../../../shared/utils/api.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoPesos } from '../../../shared/utils/formato.js';
import CobroAutomaticoPanel from '../components/CobroAutomaticoPanel.jsx';

// Mes en curso en hora de Chile (toISOString usaría UTC y cambiaría de mes 3-4 horas antes)
const mesActual = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit' }).format(new Date());

// Listado mensual de pagos para el contador (HU-06) + operaciones de facturación
export default function PagosMesPage() {
  const [periodo, setPeriodo] = useState(mesActual());
  const [pagos, setPagos] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function consultar(e) {
    e?.preventDefault();
    setError(null);
    setAviso(null);
    try {
      setPagos(await pagosDelMes(periodo));
    } catch (err) { setError(err); }
  }

  // Descarga el CSV incluyendo el token de sesión (HU-06)
  async function descargarCsv() {
    setError(null);
    try {
      const res = await fetch(`/api/admin/finanzas/pagos?periodo=${periodo}&formato=csv`, {
        headers: { Authorization: `Bearer ${leerToken()}` },
      });
      if (!res.ok) throw new Error('No se pudo generar el archivo');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pagos-${periodo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(err); }
  }

  async function ejecutar(accion, fn) {
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      const r = await fn();
      if (accion === 'cuotas') setAviso(`Período ${r.periodo}: ${r.cuotas_generadas} cuotas generadas, ${r.cuotas_vencidas} marcadas vencidas.`);
      else setAviso(`Cargos procesados: ${r.aprobados} aprobados, ${r.rechazados} rechazados${r.pendientes ? `, ${r.pendientes} en espera de la pasarela` : ''}${r.errores ? `, ${r.errores} con error de conexión` : ''} de ${r.intentos} cuotas vencidas.`);
      await consultar();
    } catch (err) { setError(err); } finally { setOcupado(false); }
  }

  // El listado del mes en curso se carga al entrar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { consultar(); }, []);

  return (
    <section>
      <h1>Pagos del mes</h1>

      <CobroAutomaticoPanel onEjecutado={consultar} />

      <details className="operaciones-manuales">
        <summary>Operaciones manuales</summary>
        <p className="texto-suave">
          No suelen hacer falta: el cobro automático hace ambas cada día. Sirven para generar las cuotas
          de otro período o reintentar cobros rechazados hoy.
        </p>
        <div className="acciones">
          <button className="boton secundario" disabled={ocupado} onClick={() => ejecutar('cuotas', () => generarCuotas(periodo))}>
            Generar cuotas de {periodo}
          </button>
          <button className="boton secundario" disabled={ocupado} onClick={() => ejecutar('cargos', procesarCargos)}>
            Reintentar cargos ahora
          </button>
        </div>
      </details>

      <h2>Pagos recibidos</h2>
      <form className="fila" onSubmit={consultar}>
        <label>Período<input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} required /></label>
        <button type="submit" className="boton">Consultar</button>
        <button type="button" className="boton secundario" onClick={descargarCsv}>Descargar CSV</button>
      </form>

      <Mensaje error={error} />
      {aviso && <div className="mensaje-ok" role="status">{aviso}</div>}

      {pagos && (
        <>
          <h2>{pagos.length} pago(s) · Total {formatoPesos(pagos.reduce((t, p) => t + p.monto, 0))}</h2>
          {pagos.length > 0 && (
            <table className="tabla">
              <thead>
                <tr><th>Fecha</th><th>Cliente</th><th>RUT</th><th>Monto</th><th>Origen</th><th>Referencia</th><th>Período</th></tr>
              </thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id_pago}>
                    <td data-label="Fecha">{new Date(p.fecha_pago).toLocaleDateString('es-CL')}</td>
                    <td data-label="Cliente">{p.cliente}</td>
                    <td data-label="RUT">{p.rut}</td>
                    <td data-label="Monto">{formatoPesos(p.monto)}</td>
                    <td data-label="Origen">{p.origen}</td>
                    <td data-label="Referencia">{p.referencia ?? '—'}</td>
                    <td data-label="Período">{p.periodo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
