import { useCallback, useEffect, useState } from 'react';
import {
  listarMantenciones, listarTrabajadores, asignarMantencion, cancelarMantencion,
} from '../services/adminService.js';
import { EtiquetaOrden } from '../../trabajador/components/ordenUtils.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoFecha } from '../../../shared/utils/formato.js';

// Calendario de mantenciones agrupado por comuna, con asignación (HU-04, HU-17)
export default function CalendarioPage() {
  const [mantenciones, setMantenciones] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [filtros, setFiltros] = useState({ estado: '', desde: '', hasta: '' });
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    Promise.all([listarMantenciones(filtros), listarTrabajadores()])
      .then(([m, t]) => {
        setMantenciones(m);
        setTrabajadores(t.filter((x) => x.activo));
      })
      .catch(setError);
  }, [filtros]);
  useEffect(() => { cargar(); }, [cargar]);

  async function asignar(id, idTrabajador) {
    if (!idTrabajador) return;
    setError(null);
    try {
      await asignarMantencion(id, Number(idTrabajador));
      await cargar();
    } catch (err) { setError(err); }
  }

  async function cancelar(id) {
    if (!window.confirm('¿Cancelar esta mantención?')) return;
    try {
      await cancelarMantencion(id, 'Cancelada por el administrador');
      await cargar();
    } catch (err) { setError(err); }
  }

  // Agrupa por comuna (HU-04)
  const porComuna = mantenciones.reduce((acc, m) => {
    (acc[m.comuna] ??= []).push(m);
    return acc;
  }, {});

  return (
    <section>
      <h1>Calendario de mantenciones</h1>

      <div className="filtros">
        <label>Estado
          <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_curso">En curso</option>
            <option value="finalizada">Finalizada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </label>
        <label>Desde<input type="date" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} /></label>
        <label>Hasta<input type="date" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} /></label>
      </div>

      <Mensaje error={error} />
      {mantenciones.length === 0 && <p>No hay mantenciones con esos filtros.</p>}

      {Object.entries(porComuna).map(([comuna, lista]) => (
        <div key={comuna}>
          <h2>{comuna}</h2>
          <table className="tabla">
            <thead>
              <tr><th>Fecha</th><th>Planta</th><th>Cliente</th><th>Tipo</th><th>Estado</th><th>Trabajador</th><th></th></tr>
            </thead>
            <tbody>
              {lista.map((m) => (
                <tr key={m.id_mantencion}>
                  <td data-label="Fecha">{formatoFecha(m.fecha_programada)}</td>
                  <td data-label="Planta">{m.direccion}</td>
                  <td data-label="Cliente">{m.cliente}</td>
                  <td data-label="Tipo">{m.tipo}</td>
                  <td data-label="Estado"><EtiquetaOrden estado={m.estado} /></td>
                  <td data-label="Trabajador">
                    {['pendiente', 'en_curso'].includes(m.estado) ? (
                      <select value={m.id_trabajador ?? ''} onChange={(e) => asignar(m.id_mantencion, e.target.value)}>
                        <option value="">Sin asignar</option>
                        {trabajadores.map((t) => <option key={t.id_usuario} value={t.id_usuario}>{t.nombre}</option>)}
                      </select>
                    ) : (m.trabajador ?? '—')}
                  </td>
                  <td data-label="">
                    {['pendiente', 'en_curso'].includes(m.estado) && (
                      <button className="boton peligro" onClick={() => cancelar(m.id_mantencion)}>Cancelar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}
