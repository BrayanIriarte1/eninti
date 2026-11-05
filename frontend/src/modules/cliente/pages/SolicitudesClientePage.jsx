import { useCallback, useEffect, useState } from 'react';
import { misPlantas, misSolicitudes, crearSolicitud } from '../services/clienteService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoFecha } from '../../../shared/utils/formato.js';

const ESTADO_CLASE = { pendiente: 'neutro', asignada: 'ok', rechazada: 'alerta', cerrada: 'neutro' };

// Solicitud de mantención desde la plataforma (HU-11)
export default function SolicitudesClientePage() {
  const [plantas, setPlantas] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [idPlanta, setIdPlanta] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(
    () => Promise.all([misPlantas(), misSolicitudes()]).then(([p, s]) => {
      setPlantas(p);
      setSolicitudes(s);
    }).catch(setError),
    [],
  );
  useEffect(() => { cargar(); }, [cargar]);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await crearSolicitud({ id_planta: Number(idPlanta), motivo: motivo.trim() });
      setMotivo('');
      setIdPlanta('');
      await cargar();
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section>
      <h1>Solicitudes de mantención</h1>

      <article className="tarjeta" style={{ maxWidth: 600, marginBottom: '1.5rem' }}>
        <h2>Nueva solicitud</h2>
        <form className="formulario-simple" onSubmit={enviar}>
          <Mensaje error={error} />
          <label>
            Planta
            <select value={idPlanta} onChange={(e) => setIdPlanta(e.target.value)} required>
              <option value="">Selecciona una planta</option>
              {plantas.map((p) => <option key={p.id_planta} value={p.id_planta}>{p.direccion}</option>)}
            </select>
          </label>
          <label>
            Motivo
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} required maxLength={255}
              placeholder="Describe brevemente la falla o el requerimiento" />
          </label>
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </form>
      </article>

      <h2>Mis solicitudes</h2>
      {solicitudes.length === 0 ? (
        <p>Aún no has enviado solicitudes.</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr><th>Fecha</th><th>Planta</th><th>Motivo</th><th>Estado</th><th>Fecha asignada</th></tr>
          </thead>
          <tbody>
            {solicitudes.map((s) => (
              <tr key={s.id_solicitud}>
                <td data-label="Fecha">{new Date(s.fecha_solicitud).toLocaleDateString('es-CL')}</td>
                <td data-label="Planta">{s.direccion}</td>
                <td data-label="Motivo">{s.motivo}</td>
                <td data-label="Estado"><span className={`etiqueta ${ESTADO_CLASE[s.estado] ?? 'neutro'}`}>{s.estado}</span></td>
                <td data-label="Fecha asignada">{s.fecha_asignada ? formatoFecha(s.fecha_asignada) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
