import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarPlantas } from '../services/plantasService.js';
import EstadoSuscripcion from '../components/EstadoSuscripcion.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoPesos } from '../../../shared/utils/formato.js';

export default function PlantasPage() {
  const [plantas, setPlantas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [comuna, setComuna] = useState('');

  useEffect(() => {
    listarPlantas().then(setPlantas).catch(setError).finally(() => setCargando(false));
  }, []);

  const comunas = useMemo(
    () => [...new Set(plantas.map((p) => p.comuna))].sort((a, b) => a.localeCompare(b, 'es')),
    [plantas],
  );

  const filtradas = plantas.filter((p) => {
    const texto = `${p.cliente.nombre} ${p.cliente.rut} ${p.direccion}`.toLowerCase();
    return (!comuna || p.comuna === comuna) && texto.includes(busqueda.trim().toLowerCase());
  });

  return (
    <section>
      <div className="encabezado">
        <h1>Plantas</h1>
        <Link className="boton" to="/admin/plantas/nueva">Nueva planta</Link>
      </div>

      <div className="filtros">
        <label>
          Buscar
          <input
            type="search"
            placeholder="Cliente, RUT o dirección"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
        <label>
          Comuna
          <select value={comuna} onChange={(e) => setComuna(e.target.value)}>
            <option value="">Todas</option>
            {comunas.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <Mensaje error={error} />
      {cargando && <p>Cargando…</p>}
      {!cargando && !error && filtradas.length === 0 && <p>No hay plantas que coincidan.</p>}

      {filtradas.length > 0 && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Dirección</th>
              <th>Comuna</th>
              <th>Potencia</th>
              <th>Cuota mensual</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((p) => (
              <tr key={p.id_planta}>
                <td data-label="Cliente">
                  <Link to={`/admin/plantas/${p.id_planta}`}>{p.cliente.nombre}</Link>
                </td>
                <td data-label="Dirección">{p.direccion}</td>
                <td data-label="Comuna">{p.comuna}</td>
                <td data-label="Potencia">{p.potencia_kw} kW</td>
                <td data-label="Cuota mensual">
                  {p.suscripcion ? formatoPesos(p.suscripcion.monto_mensual) : '—'}
                </td>
                <td data-label="Estado"><EstadoSuscripcion estado={p.suscripcion?.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
