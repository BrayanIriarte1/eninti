import { useState } from 'react';
import { pagosDelMes, generarCuotas, procesarCargos } from '../services/adminService.js';
import { leerToken } from '../../../shared/utils/api.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoPesos } from '../../../shared/utils/formato.js';

const mesActual = () => new Date().toISOString().slice(0, 7);

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
      else setAviso(`Cargos procesados: ${r.aprobados} aprobados y ${r.rechazados} rechazados de ${r.intentos} intentos.`);
      await consultar();
    } catch (err) { setError(err); } finally { setOcupado(false); }
  }

  return (
    <section>
      <h1>Pagos del mes</h1>

      <form className="fila" onSubmit={consultar}>
        <label>Período<input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} required /></label>
        <button type="submit" className="boton">Consultar</button>
        <button type="button" className="boton secundario" onClick={descargarCsv}>Descargar CSV</button>
      </form>

      <div className="acciones">
        <button className="boton secundario" disabled={ocupado} onClick={() => ejecutar('cuotas', () => generarCuotas(periodo))}>
          Generar cuotas del período
        </button>
        <button className="boton secundario" disabled={ocupado} onClick={() => ejecutar('cargos', procesarCargos)}>
          Procesar cargos recurrentes
        </button>
      </div>

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
