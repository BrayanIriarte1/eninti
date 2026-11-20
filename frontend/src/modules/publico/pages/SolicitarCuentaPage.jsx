import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarComunasPublicas, solicitarCuenta } from '../services/publicoService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';

const VACIO = {
  nombre: '', rut: '', email: '', telefono: '',
  direccion_planta: '', id_comuna: '', potencia_kw: '', tiene_baterias: '', mensaje: '',
};

// Contactar al administrador (HU-07): el cliente sin cuenta no se registra solo.
// Envía sus datos y los de su planta; el administrador crea la cuenta desde su panel.
export default function SolicitarCuentaPage() {
  const [form, setForm] = useState(VACIO);
  const [comunas, setComunas] = useState([]);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);

  useEffect(() => { listarComunasPublicas().then(setComunas).catch(setError); }, []);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await solicitarCuenta({
        ...form,
        id_comuna: Number(form.id_comuna),
        potencia_kw: form.potencia_kw ? Number(form.potencia_kw) : null,
        tiene_baterias: form.tiene_baterias === '' ? null : form.tiene_baterias === 'si',
        mensaje: form.mensaje.trim() || undefined,
      });
      setEnviada(true);
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  }

  if (enviada) {
    return (
      <main className="acceso">
        <div className="acceso-tarjeta">
          <h1 className="acceso-marca">Solicitud enviada</h1>
          <p className="mensaje-ok" role="status">
            Recibimos tus datos y los de tu planta. El administrador de ENINTI revisará tu solicitud,
            creará tu cuenta y te contactará con tus datos de acceso.
          </p>
          <p className="acceso-pie"><Link to="/login">Volver al inicio de sesión</Link></p>
        </div>
      </main>
    );
  }

  return (
    <main className="acceso">
      <div className="acceso-tarjeta acceso-tarjeta-ancha">
        <h1 className="acceso-marca">Contactar al administrador</h1>
        <p className="acceso-sub">
          Las cuentas de clientes las crea ENINTI. Déjanos tus datos y los de tu planta solar,
          y el administrador te contactará para activar tu cuenta y tu plan de mantención.
        </p>

        <form className="formulario" onSubmit={enviar}>
          <Mensaje error={error} />
          <fieldset>
            <legend>Tus datos</legend>
            <label>Nombre completo<input name="nombre" value={form.nombre} onChange={cambiar} required maxLength={120} autoFocus /></label>
            <label>RUT<input name="rut" value={form.rut} onChange={cambiar} required placeholder="12345678-9" /></label>
            <label>Correo electrónico<input name="email" type="email" value={form.email} onChange={cambiar} required /></label>
            <label>Teléfono<input name="telefono" value={form.telefono} onChange={cambiar} required placeholder="+56912345678" /></label>
          </fieldset>
          <fieldset>
            <legend>Tu planta solar</legend>
            <label className="ancho-completo">Dirección de la planta<input name="direccion_planta" value={form.direccion_planta} onChange={cambiar} required maxLength={200} /></label>
            <label>Comuna
              <select name="id_comuna" value={form.id_comuna} onChange={cambiar} required>
                <option value="">Selecciona una comuna</option>
                {comunas.map((c) => <option key={c.id_comuna} value={c.id_comuna}>{c.nombre}</option>)}
              </select>
            </label>
            <label>Potencia aproximada (kW) <span className="opcional">(si la conoces)</span>
              <input name="potencia_kw" type="number" step="0.01" min="0.01" value={form.potencia_kw} onChange={cambiar} />
            </label>
            <label>¿Tiene baterías?
              <select name="tiene_baterias" value={form.tiene_baterias} onChange={cambiar}>
                <option value="">No lo sé</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className="ancho-completo">Mensaje <span className="opcional">(opcional)</span>
              <textarea name="mensaje" value={form.mensaje} onChange={cambiar} maxLength={500} rows={3} />
            </label>
          </fieldset>
          <div className="acciones">
            <Link className="boton secundario" to="/login">Volver</Link>
            <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
          </div>
        </form>
      </div>
    </main>
  );
}
