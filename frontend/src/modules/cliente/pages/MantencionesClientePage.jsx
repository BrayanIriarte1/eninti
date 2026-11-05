import { useEffect, useState } from 'react';
import { misMantenciones } from '../services/clienteService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoFecha } from '../../../shared/utils/formato.js';

// Última mantención finalizada y próxima programada por planta (HU-09)
export default function MantencionesClientePage() {
  const [plantas, setPlantas] = useState([]);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    misMantenciones().then(setPlantas).catch(setError).finally(() => setCargando(false));
  }, []);

  if (cargando) return <p>Cargando…</p>;
  if (error) return <Mensaje error={error} />;

  return (
    <section>
      <h1>Mantenciones</h1>
      <div className="columnas">
        {plantas.map((p) => (
          <article key={p.id_planta} className="tarjeta">
            <h2>{p.direccion}</h2>
            <h3>Última mantención</h3>
            {p.ultima ? (
              <p>
                <strong>{formatoFecha(p.ultima.fecha)}</strong> · {p.ultima.tipo}
                {p.ultima.actividades && <><br /><span className="texto-suave">{p.ultima.actividades}</span></>}
              </p>
            ) : (
              <p className="texto-suave">Sin mantenciones finalizadas aún.</p>
            )}
            <h3>Próxima mantención</h3>
            {p.proxima ? (
              <p><strong>{formatoFecha(p.proxima.fecha)}</strong> · {p.proxima.tipo} ({p.proxima.estado})</p>
            ) : (
              <p className="texto-suave">No hay una visita programada.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
