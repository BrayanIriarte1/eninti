import { useCallback, useEffect, useState } from 'react';
import { listarCatalogo, crearServicio, actualizarServicio } from '../services/adminService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import { formatoPesos } from '../../../shared/utils/formato.js';

const VACIO = { nombre: '', descripcion: '', tipo: 'servicio', precio: '' };

// Catálogo de planes y servicios como datos (RNF-07), base del cotizador público
export default function CatalogoPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(() => listarCatalogo().then(setItems).catch(setError), []);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function crear(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await crearServicio({ ...form, precio: Number(form.precio) });
      setForm(VACIO);
      await cargar();
    } catch (err) { setError(err); } finally { setEnviando(false); }
  }

  async function alternar(item) {
    try { await actualizarServicio(item.id_item, { activo: !item.activo }); await cargar(); } catch (err) { setError(err); }
  }

  return (
    <section>
      <h1>Catálogo de servicios</h1>

      <article className="tarjeta" style={{ marginBottom: '1.5rem' }}>
        <h2>Nuevo ítem</h2>
        <form className="formulario" onSubmit={crear}>
          <Mensaje error={error} />
          <fieldset>
            <legend>Datos</legend>
            <label>Nombre<input name="nombre" value={form.nombre} onChange={cambiar} required maxLength={120} /></label>
            <label>Tipo
              <select name="tipo" value={form.tipo} onChange={cambiar}>
                <option value="plan">Plan (mensual)</option>
                <option value="servicio">Servicio (puntual)</option>
              </select>
            </label>
            <label>Precio (CLP)<input name="precio" type="number" min="0" step="1" value={form.precio} onChange={cambiar} required /></label>
            <label className="ancho-completo">Descripción<input name="descripcion" value={form.descripcion} onChange={cambiar} required maxLength={255} /></label>
          </fieldset>
          <div className="acciones">
            <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Agregar'}</button>
          </div>
        </form>
      </article>

      <table className="tabla">
        <thead>
          <tr><th>Nombre</th><th>Tipo</th><th>Precio</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id_item}>
              <td data-label="Nombre">{i.nombre}<br /><span className="texto-suave">{i.descripcion}</span></td>
              <td data-label="Tipo">{i.tipo}</td>
              <td data-label="Precio">{formatoPesos(i.precio)}{i.tipo === 'plan' ? '/mes' : ''}</td>
              <td data-label="Estado"><span className={`etiqueta ${i.activo ? 'ok' : 'neutro'}`}>{i.activo ? 'Activo' : 'Inactivo'}</span></td>
              <td data-label=""><button className="boton secundario" onClick={() => alternar(i)}>{i.activo ? 'Desactivar' : 'Activar'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
