import { useCallback, useEffect, useState } from 'react';
import { listarClientes, crearCliente, actualizarCliente, listarComunas } from '../services/adminService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';

const VACIO = { rut: '', nombre: '', telefono: '', direccion: '', id_comuna: '' };

// Administración de la ficha de clientes (HU-03)
export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [comunas, setComunas] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(
    () => Promise.all([listarClientes(), listarComunas()]).then(([c, co]) => {
      setClientes(c);
      setComunas(co);
    }).catch(setError),
    [],
  );
  useEffect(() => { cargar(); }, [cargar]);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  function editar(c) {
    setEditando(c.id_cliente);
    setForm({ rut: c.rut, nombre: c.nombre, telefono: c.telefono ?? '', direccion: c.direccion ?? '', id_comuna: String(c.id_comuna ?? '') });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function limpiar() {
    setEditando(null);
    setForm(VACIO);
    setError(null);
  }

  async function guardar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const datos = {
      ...form,
      telefono: form.telefono.trim() || null,
      direccion: form.direccion.trim() || null,
      id_comuna: form.id_comuna ? Number(form.id_comuna) : null,
    };
    try {
      if (editando) await actualizarCliente(editando, datos);
      else await crearCliente(datos);
      limpiar();
      await cargar();
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section>
      <h1>Clientes</h1>

      <article className="tarjeta" style={{ marginBottom: '1.5rem' }}>
        <h2>{editando ? 'Editar cliente' : 'Nuevo cliente'}</h2>
        <form className="formulario" onSubmit={guardar}>
          <Mensaje error={error} />
          <fieldset>
            <legend>Datos</legend>
            <label>RUT<input name="rut" value={form.rut} onChange={cambiar} required placeholder="12345678-9" /></label>
            <label>Nombre<input name="nombre" value={form.nombre} onChange={cambiar} required maxLength={120} /></label>
            <label>Teléfono <span className="opcional">(opcional)</span><input name="telefono" value={form.telefono} onChange={cambiar} /></label>
            <label>Comuna
              <select name="id_comuna" value={form.id_comuna} onChange={cambiar}>
                <option value="">Sin comuna</option>
                {comunas.map((c) => <option key={c.id_comuna} value={c.id_comuna}>{c.nombre}</option>)}
              </select>
            </label>
            <label className="ancho-completo">Dirección <span className="opcional">(opcional)</span><input name="direccion" value={form.direccion} onChange={cambiar} maxLength={200} /></label>
          </fieldset>
          <div className="acciones">
            {editando && <button type="button" className="boton secundario" onClick={limpiar}>Cancelar</button>}
            <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </article>

      <table className="tabla">
        <thead>
          <tr><th>RUT</th><th>Nombre</th><th>Comuna</th><th>Plantas</th><th>Cuenta web</th><th></th></tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id_cliente}>
              <td data-label="RUT">{c.rut}</td>
              <td data-label="Nombre">{c.nombre}</td>
              <td data-label="Comuna">{c.comuna ?? '—'}</td>
              <td data-label="Plantas">{c.plantas}</td>
              <td data-label="Cuenta web">
                <span className={`etiqueta ${c.tiene_cuenta ? 'ok' : 'neutro'}`}>{c.tiene_cuenta ? 'Sí' : 'No'}</span>
              </td>
              <td data-label=""><button className="boton secundario" onClick={() => editar(c)}>Editar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
