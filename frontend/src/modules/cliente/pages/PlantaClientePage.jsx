// ============================================================================
// PANTALLA: Ficha de mi planta · URL /cliente/plantas/:id · Rol: cliente
// Casos de uso: CU-06
// Datos: clienteService.obtenerPlanta(id) → GET /api/cliente/plantas/:id → cliente.service.js · obtenerPlanta()
// Patrón: useState (datos/error) → cargar() pide a la API → render. Tras guardar, se vuelve a cargar().
// Los textos que ves en pantalla están en el JSX de abajo; las reglas están en el backend.
// ============================================================================
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { obtenerPlanta } from '../services/clienteService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoFecha } from '../../../shared/utils/formato.js';

// Ficha técnica de una planta propia (HU-10)
export default function PlantaClientePage() {
  const { id } = useParams();
  const [planta, setPlanta] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    obtenerPlanta(id).then(setPlanta).catch(setError);
  }, [id]);

  if (error) return <Mensaje error={error} />;
  if (!planta) return <p className="cargando">Cargando…</p>;

  const ficha = [
    ['Dirección', planta.direccion],
    ['Comuna', planta.comuna],
    ['Potencia', `${planta.potencia_kw} kW`],
    ['Inversor', planta.inversor],
    ['Paneles', planta.paneles],
    ['Baterías', planta.baterias ?? 'Sin baterías'],
    ['Fecha de instalación', formatoFecha(planta.fecha_instalacion)],
  ];

  return (
    <section>
      <p><Link to="/cliente/plantas">← Volver a mis plantas</Link></p>
      <h1>{planta.direccion}</h1>
      <article className="tarjeta" style={{ maxWidth: 560 }}>
        <h2>Ficha técnica</h2>
        <dl className="ficha">
          {ficha.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </article>
    </section>
  );
}
