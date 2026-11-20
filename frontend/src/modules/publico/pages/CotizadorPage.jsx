import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Marca from '../../../shared/components/Marca.jsx';
import { catalogoPublico } from '../services/publicoService.js';
import { formatoPesos } from '../../../shared/utils/formato.js';

// Cotizador público de planes y servicios (RNF-07), sin autenticación
export default function CotizadorPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    catalogoPublico().then(setItems).catch(() => setError(true));
  }, []);

  const planes = items.filter((i) => i.tipo === 'plan');
  const servicios = items.filter((i) => i.tipo === 'servicio');

  return (
    <div className="layout">
      <header className="publico-barra">
        <Link to="/login" aria-label="ENINTI, ir al inicio de sesión"><Marca /></Link>
        <nav className="publico-acciones">
          <Link className="boton secundario" to="/solicitar-cuenta">Solicitar cuenta</Link>
          <Link className="boton" to="/login">Iniciar sesión</Link>
        </nav>
      </header>
      <main className="contenido contenido-publico">
        <h1>Planes y servicios</h1>
        <p className="texto-suave">Mantención preventiva de sistemas solares fotovoltaicos en la Región de Antofagasta.</p>
        {error && <p>No se pudo cargar el catálogo en este momento.</p>}

        <h2>Planes de suscripción</h2>
        <div className="columnas">
          {planes.map((p) => (
            <article key={p.id_item} className="tarjeta plan-destacado">
              <h3>{p.nombre}</h3>
              <p className="plan-precio">{formatoPesos(p.precio)}<span>/mes</span></p>
              <p>{p.descripcion}</p>
              <Link className="boton" to="/solicitar-cuenta">Suscribirme</Link>
            </article>
          ))}
        </div>

        <h2>Servicios puntuales</h2>
        <table className="tabla">
          <thead><tr><th>Servicio</th><th>Descripción</th><th>Valor referencial</th></tr></thead>
          <tbody>
            {servicios.map((s) => (
              <tr key={s.id_item}>
                <td data-label="Servicio">{s.nombre}</td>
                <td data-label="Descripción">{s.descripcion}</td>
                <td data-label="Valor referencial">{formatoPesos(s.precio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="texto-suave">Valores de referencia con IVA incluido. Los repuestos se cotizan por separado.</p>
      </main>
    </div>
  );
}
