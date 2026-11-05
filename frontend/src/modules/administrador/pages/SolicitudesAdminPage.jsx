import { useCallback, useEffect, useState } from 'react';
import { listarSolicitudes, rechazarSolicitud, listarTrabajadores, crearMantencion } from '../services/adminService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoFecha } from '../../../shared/utils/formato.js';

const ESTADO_CLASE = { pendiente: 'alerta', asignada: 'ok', rechazada: 'neutro', cerrada: 'neutro' };

// Bandeja de solicitudes del cliente: programar como mantención o rechazar (HU-11, HU-17)
export default function SolicitudesAdminPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [error, setError] = useState(null);
  const [programando, setProgramando] = useState(null); // id_solicitud
  const [form, setForm] = useState({ fecha_programada: '', id_trabajador: '', tipo: 'correctiva' });

  const cargar = useCallback(() => {
    Promise.all([listarSolicitudes(), listarTrabajadores()])
      .then(([s, t]) => { setSolicitudes(s); setTrabajadores(t.filter((x) => x.activo)); })
      .catch(setError);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function programar(s) {
    setError(null);
    try {
      await crearMantencion({
        id_planta: s.id_planta,
        id_solicitud: s.id_solicitud,
        tipo: form.tipo,
        fecha_programada: form.fecha_programada,
        id_trabajador: form.id_trabajador ? Number(form.id_trabajador) : undefined,
      });
      setProgramando(null);
      setForm({ fecha_programada: '', id_trabajador: '', tipo: 'correctiva' });
      await cargar();
    } catch (err) { setError(err); }
  }

  async function rechazar(id) {
    if (!window.confirm('¿Rechazar esta solicitud?')) return;
    try { await rechazarSolicitud(id); await cargar(); } catch (err) { setError(err); }
  }

  return (
    <section>
      <h1>Solicitudes de mantención</h1>
      <Mensaje error={error} />
      {solicitudes.length === 0 && <p>No hay solicitudes.</p>}

      <div className="columnas">
        {solicitudes.map((s) => (
          <article key={s.id_solicitud} className="tarjeta">
            <div className="encabezado">
              <h2 style={{ margin: 0 }}>{s.cliente}</h2>
              <span className={`etiqueta ${ESTADO_CLASE[s.estado] ?? 'neutro'}`}>{s.estado}</span>
            </div>
            <dl className="ficha">
              <div><dt>Planta</dt><dd>{s.direccion}</dd></div>
              <div><dt>Comuna</dt><dd>{s.comuna}</dd></div>
              <div><dt>Fecha</dt><dd>{new Date(s.fecha_solicitud).toLocaleDateString('es-CL')}</dd></div>
              <div><dt>Motivo</dt><dd>{s.motivo}</dd></div>
              {s.fecha_asignada && <div><dt>Asignada</dt><dd>{formatoFecha(s.fecha_asignada)}</dd></div>}
            </dl>

            {s.estado === 'pendiente' && (
              programando === s.id_solicitud ? (
                <form className="formulario-simple" onSubmit={(e) => { e.preventDefault(); programar(s); }}>
                  <label>Fecha<input type="date" value={form.fecha_programada} onChange={(e) => setForm({ ...form, fecha_programada: e.target.value })} required /></label>
                  <label>Tipo
                    <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                      <option value="correctiva">Correctiva</option>
                      <option value="preventiva">Preventiva</option>
                    </select>
                  </label>
                  <label>Trabajador
                    <select value={form.id_trabajador} onChange={(e) => setForm({ ...form, id_trabajador: e.target.value })}>
                      <option value="">Sin asignar</option>
                      {trabajadores.map((t) => <option key={t.id_usuario} value={t.id_usuario}>{t.nombre}</option>)}
                    </select>
                  </label>
                  <div className="acciones">
                    <button type="button" className="boton secundario" onClick={() => setProgramando(null)}>Cancelar</button>
                    <button type="submit" className="boton">Programar</button>
                  </div>
                </form>
              ) : (
                <div className="acciones">
                  <button className="boton" onClick={() => setProgramando(s.id_solicitud)}>Programar</button>
                  <button className="boton peligro" onClick={() => rechazar(s.id_solicitud)}>Rechazar</button>
                </div>
              )
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
