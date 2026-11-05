import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { misPlantas } from '../services/clienteService.js';
import EstadoSuscripcion from '../../administrador/components/EstadoSuscripcion.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoPesos } from '../../../shared/utils/formato.js';

// Listado de mis plantas con acceso a su ficha técnica (HU-10)
export default function MisPlantasPage() {
  const [plantas, setPlantas] = useState([]);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    misPlantas().then(setPlantas).catch(setError).finally(() => setCargando(false));
  }, []);

  if (cargando) return <p>Cargando…</p>;
  if (error) return <Mensaje error={error} />;

  return (
    <section>
      <h1>Mis plantas</h1>
      {plantas.length === 0 && <p>No tienes plantas registradas.</p>}
      <div className="columnas">
        {plantas.map((p) => (
          <article key={p.id_planta} className="tarjeta">
            <div className="encabezado">
              <h2 style={{ margin: 0 }}>{p.direccion}</h2>
              <EstadoSuscripcion estado={p.suscripcion?.estado} />
            </div>
            <dl className="ficha">
              <div><dt>Comuna</dt><dd>{p.comuna}</dd></div>
              <div><dt>Potencia</dt><dd>{p.potencia_kw} kW</dd></div>
              {p.suscripcion && <div><dt>Cuota</dt><dd>{formatoPesos(p.suscripcion.monto_mensual)}/mes</dd></div>}
            </dl>
            <Link className="boton secundario" to={`/cliente/plantas/${p.id_planta}`}>Ver ficha técnica</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
