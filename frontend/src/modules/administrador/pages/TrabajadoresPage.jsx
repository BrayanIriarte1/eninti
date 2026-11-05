import { useCallback, useEffect, useState } from 'react';
import { listarTrabajadores, crearTrabajador, actualizarTrabajador } from '../services/adminService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';

const VACIO = { nombre: '', email: '', password: '', telefono: '' };

// Alta, edición y desactivación de trabajadores (HU-15)
export default function TrabajadoresPage() {
  const [trabajadores, setTrabajadores] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(() => listarTrabajadores().then(setTrabajadores).catch(setError), []);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function crear(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await crearTrabajador({ ...form, telefono: form.telefono.trim() || undefined });
      setForm(VACIO);
      await cargar();
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  }

  async function alternar(t) {
    const verbo = t.activo ? 'desactivar' : 'reactivar';
    if (!window.confirm(`¿Seguro que quieres ${verbo} a ${t.nombre}?`)) return;
    try {
      await actualizarTrabajador(t.id_usuario, { activo: !t.activo });
      await cargar();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <section>
      <h1>Trabajadores</h1>

      <article className="tarjeta" style={{ marginBottom: '1.5rem' }}>
        <h2>Nuevo trabajador</h2>
        <form className="formulario" onSubmit={crear}>
          <Mensaje error={error} />
          <fieldset>
            <legend>Datos de acceso</legend>
            <label>Nombre<input name="nombre" value={form.nombre} onChange={cambiar} required maxLength={120} /></label>
            <label>Correo<input name="email" type="email" value={form.email} onChange={cambiar} required /></label>
            <label>Contraseña inicial <span className="opcional">(mín. 8)</span><input name="password" type="password" value={form.password} onChange={cambiar} required minLength={8} /></label>
            <label>Teléfono <span className="opcional">(opcional)</span><input name="telefono" value={form.telefono} onChange={cambiar} /></label>
          </fieldset>
          <div className="acciones">
            <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Creando…' : 'Crear trabajador'}</button>
          </div>
        </form>
      </article>

      <table className="tabla">
        <thead>
          <tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          {trabajadores.map((t) => (
            <tr key={t.id_usuario}>
              <td data-label="Nombre">{t.nombre}</td>
              <td data-label="Correo">{t.email}</td>
              <td data-label="Teléfono">{t.telefono ?? '—'}</td>
              <td data-label="Estado"><span className={`etiqueta ${t.activo ? 'ok' : 'alerta'}`}>{t.activo ? 'Activo' : 'Inactivo'}</span></td>
              <td data-label="">
                <button className={`boton ${t.activo ? 'peligro' : 'secundario'}`} onClick={() => alternar(t)}>
                  {t.activo ? 'Desactivar' : 'Reactivar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
