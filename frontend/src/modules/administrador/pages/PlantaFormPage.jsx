import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  actualizarPlanta, crearPlanta, listarClientes, listarComunas, obtenerPlanta,
} from '../services/plantasService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';

const VACIO = {
  id_cliente: '',
  id_comuna: '',
  direccion: '',
  potencia_kw: '',
  inversor: '',
  paneles: '',
  baterias: '',
  fecha_instalacion: '',
};

// Convierte los valores del formulario (todos texto) a los tipos que espera la API
function aDatosApi(form) {
  return {
    ...form,
    id_cliente: Number(form.id_cliente),
    id_comuna: Number(form.id_comuna),
    potencia_kw: Number(form.potencia_kw),
    baterias: form.baterias.trim() || null,
  };
}

export default function PlantaFormPage() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(VACIO);
  const [clientes, setClientes] = useState([]);
  const [comunas, setComunas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([listarClientes(), listarComunas(), editando ? obtenerPlanta(id) : null])
      .then(([listaClientes, listaComunas, planta]) => {
        setClientes(listaClientes);
        setComunas(listaComunas);
        if (planta) {
          setForm(Object.fromEntries(Object.keys(VACIO).map((k) => [k, String(planta[k] ?? '')])));
        }
      })
      .catch(setError)
      .finally(() => setCargando(false));
  }, [id, editando]);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const planta = editando
        ? await actualizarPlanta(id, aDatosApi(form))
        : await crearPlanta(aDatosApi(form));
      navigate(`/admin/plantas/${planta.id_planta}`);
    } catch (err) {
      setError(err);
      setGuardando(false);
    }
  }

  if (cargando) return <p>Cargando…</p>;

  return (
    <section>
      <div className="encabezado">
        <h1>{editando ? 'Editar planta' : 'Nueva planta'}</h1>
      </div>

      <form className="formulario" onSubmit={guardar}>
        <Mensaje error={error} />

        <fieldset>
          <legend>Cliente y ubicación</legend>
          <label>
            Cliente
            <select name="id_cliente" value={form.id_cliente} onChange={cambiar} required>
              <option value="">Selecciona un cliente</option>
              {clientes.map((c) => (
                <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} · {c.rut}</option>
              ))}
            </select>
          </label>
          <label>
            Comuna
            <select name="id_comuna" value={form.id_comuna} onChange={cambiar} required>
              <option value="">Selecciona una comuna</option>
              {comunas.map((c) => (
                <option key={c.id_comuna} value={c.id_comuna}>{c.nombre}</option>
              ))}
            </select>
          </label>
          <label className="ancho-completo">
            Dirección
            <input name="direccion" value={form.direccion} onChange={cambiar} required maxLength={200} />
          </label>
        </fieldset>

        <fieldset>
          <legend>Ficha técnica</legend>
          <label>
            Potencia (kW)
            <input name="potencia_kw" type="number" step="0.01" min="0.01" value={form.potencia_kw} onChange={cambiar} required />
          </label>
          <label>
            Fecha de instalación
            <input name="fecha_instalacion" type="date" value={form.fecha_instalacion} onChange={cambiar} required />
          </label>
          <label>
            Inversor
            <input name="inversor" value={form.inversor} onChange={cambiar} required maxLength={100} placeholder="Ej.: Huawei SUN2000-3KTL" />
          </label>
          <label>
            Paneles
            <input name="paneles" value={form.paneles} onChange={cambiar} required maxLength={100} placeholder="Ej.: 6 × JA Solar 550 W" />
          </label>
          <label className="ancho-completo">
            Baterías <span className="opcional">(opcional)</span>
            <input name="baterias" value={form.baterias} onChange={cambiar} maxLength={100} placeholder="Ej.: Pylontech US5000 × 2" />
          </label>
        </fieldset>

        <div className="acciones">
          <Link className="boton secundario" to={editando ? `/admin/plantas/${id}` : '/admin/plantas'}>Cancelar</Link>
          <button type="submit" className="boton" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </section>
  );
}
