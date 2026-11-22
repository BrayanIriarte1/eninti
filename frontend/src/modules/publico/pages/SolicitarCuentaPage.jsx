import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { listarComunasPublicas, solicitarCuenta } from '../services/publicoService.js';
import RutInput from '../../../shared/components/RutInput.jsx';
import TelefonoInput from '../../../shared/components/TelefonoInput.jsx';
import Mensaje from '../../../shared/components/Mensaje.jsx';
import EscenaPublica, { PortadaPublica } from '../components/EscenaPublica.jsx';
import { enlaceWhatsapp } from '../../../shared/utils/contacto.js';
import {
  IconoCheck, IconoFlecha, IconoMensaje, IconoPanel, IconoUsuario, IconoVolver,
} from '../components/IconosPublicos.jsx';

const VACIO = {
  nombre: '', rut: '', email: '', telefono: '',
  direccion_planta: '', id_comuna: '', potencia_kw: '', tiene_baterias: '', mensaje: '',
};

const PASOS = [
  { titulo: 'Tus datos', icono: <IconoUsuario /> },
  { titulo: 'Tu planta', icono: <IconoPanel /> },
  { titulo: 'Revisar y enviar', icono: <IconoMensaje /> },
];

const DESPUES = [
  ['Revisamos tu solicitud', 'El administrador de ENINTI valida tus datos y los de tu planta.'],
  ['Te contactamos', 'Coordinamos contigo el plan o servicio que necesitas.'],
  ['Recibes tu acceso', 'Creamos tu cuenta y te enviamos tus datos para iniciar sesión.'],
];

const BATERIAS = { '': 'No lo sé', si: 'Sí', no: 'No' };

// Solicitud de cuenta (HU-07): el cliente sin cuenta no se registra solo. Envía sus
// datos y los de su planta en tres pasos; el administrador crea la cuenta desde su panel.
// Cada paso usa la validación nativa del navegador: solo se avanza con los campos correctos.
export default function SolicitarCuentaPage() {
  const { state } = useLocation();
  const [form, setForm] = useState(() => ({ ...VACIO, mensaje: state?.cotizacion ? `Me interesa:\n${state.cotizacion}` : '' }));
  const [paso, setPaso] = useState(0);
  const [comunas, setComunas] = useState([]);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const titulo = useRef(null);

  useEffect(() => { listarComunasPublicas().then(setComunas).catch(setError); }, []);

  const cambiar = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const comuna = comunas.find((c) => String(c.id_comuna) === form.id_comuna)?.nombre;

  function irA(n) {
    setPaso(n);
    setError(null);
    // El foco vuelve al título del paso para lectores de pantalla y teclado
    requestAnimationFrame(() => titulo.current?.focus());
  }

  async function enviar(e) {
    e.preventDefault();
    if (paso < PASOS.length - 1) return irA(paso + 1);

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
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err);
      // Si el problema está en un dato personal (RUT o correo ya registrados, etc.), vuelve a ese paso
      if (/rut|correo|email|tel[eé]fono|nombre/i.test(err.message)) setPaso(0);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <EscenaPublica titulo="Solicitar cuenta">
      <div className="sol-grilla">
        <div className="sol-lado">
          <PortadaPublica etiqueta="Sin costo ni compromiso" titulo="Activa tu cuenta" destacado="ENINTI.">
            Las cuentas de clientes las crea ENINTI. Déjanos tus datos y los de tu planta solar,
            y el administrador te contactará para activar tu plan de mantención.
          </PortadaPublica>

          <section aria-labelledby="sol-despues" className="sol-despues">
            <h2 id="sol-despues" className="pub-h3">Qué pasa después</h2>
            <ol className="pub-linea">
              {DESPUES.map(([t, d]) => (
                <li key={t}><strong>{t}</strong><span>{d}</span></li>
              ))}
            </ol>
          </section>

          <p className="sol-ayuda">
            ¿Prefieres conversarlo?{' '}
            <a href={enlaceWhatsapp('Hola ENINTI, quiero solicitar una cuenta para mi planta solar.')} target="_blank" rel="noopener noreferrer">
              Escríbenos por WhatsApp<span className="login-oculto"> (abre en otra pestaña)</span>
            </a>{' '}
            o revisa los <Link to="/cotizador">planes y servicios</Link>.
          </p>
        </div>

        <div className="cuadro-luz sol-cuadro">
          <div className="sol-formulario">
            {enviada ? (
              <div className="sol-exito" role="status">
                <span className="sol-exito-icono"><IconoCheck tamano={40} /></span>
                <h2>¡Solicitud enviada!</h2>
                <p>
                  Gracias, {form.nombre.split(' ')[0]}. Recibimos tus datos y los de tu planta en {comuna ?? 'tu comuna'}.
                  Te contactaremos a <strong>{form.email}</strong> con tus datos de acceso.
                </p>
                <div className="sol-exito-acciones">
                  <Link className="login-entrar" to="/login">Ir al inicio de sesión <IconoFlecha /></Link>
                  <Link className="pub-boton secundario" to="/cotizador">Ver planes y servicios</Link>
                </div>
              </div>
            ) : (
              <>
                <ol className="sol-pasos" aria-label="Pasos de la solicitud">
                  {PASOS.map((p, i) => (
                    <li key={p.titulo} className={i === paso ? 'actual' : i < paso ? 'hecho' : ''} aria-current={i === paso ? 'step' : undefined}>
                      <span className="sol-pasos-marca">{i < paso ? <IconoCheck tamano={16} /> : i + 1}</span>
                      <span className="sol-pasos-nombre">{p.titulo}</span>
                    </li>
                  ))}
                </ol>

                <h2 ref={titulo} tabIndex={-1} className="sol-titulo">
                  <span className="sol-titulo-icono">{PASOS[paso].icono}</span>
                  {PASOS[paso].titulo}
                  <span className="login-oculto"> (paso {paso + 1} de {PASOS.length})</span>
                </h2>

                <form className="sol-form" onSubmit={enviar}>
                  <Mensaje error={error} />

                  {paso === 0 && (
                    <div className="sol-campos">
                      <label className="ancho-completo">Nombre completo
                        <input name="nombre" value={form.nombre} onChange={cambiar} required maxLength={120} autoComplete="name" autoFocus />
                      </label>
                      <label>RUT<RutInput value={form.rut} onChange={cambiar} required /></label>
                      <label>Correo electrónico
                        <input name="email" type="email" value={form.email} onChange={cambiar} required autoComplete="email" placeholder="nombre@correo.cl" />
                      </label>
                      <label className="ancho-completo">Teléfono<TelefonoInput value={form.telefono} onChange={cambiar} required /></label>
                    </div>
                  )}

                  {paso === 1 && (
                    <div className="sol-campos">
                      <label className="ancho-completo">Dirección de la planta
                        <input name="direccion_planta" value={form.direccion_planta} onChange={cambiar} required maxLength={200} autoComplete="street-address" />
                      </label>
                      <label className="ancho-completo">Comuna
                        <select name="id_comuna" value={form.id_comuna} onChange={cambiar} required>
                          <option value="">Selecciona una comuna</option>
                          {comunas.map((c) => <option key={c.id_comuna} value={c.id_comuna}>{c.nombre}</option>)}
                        </select>
                      </label>
                      <label className="ancho-completo"><span>Potencia aproximada en kW <span className="opcional">(si la conoces)</span></span>
                        <input name="potencia_kw" type="number" step="0.01" min="0.01" value={form.potencia_kw} onChange={cambiar} />
                      </label>
                      <fieldset className="sol-opciones ancho-completo">
                        <legend>¿Tiene baterías?</legend>
                        {Object.entries(BATERIAS).map(([valor, texto]) => (
                          <label key={valor} className={form.tiene_baterias === valor ? 'elegida' : ''}>
                            <input type="radio" name="tiene_baterias" value={valor} checked={form.tiene_baterias === valor} onChange={cambiar} />
                            {texto}
                          </label>
                        ))}
                      </fieldset>
                    </div>
                  )}

                  {paso === 2 && (
                    <>
                      <dl className="sol-revision">
                        <div><dt>Nombre</dt><dd>{form.nombre}</dd></div>
                        <div><dt>RUT</dt><dd>{form.rut}</dd></div>
                        <div><dt>Correo</dt><dd>{form.email}</dd></div>
                        <div><dt>Teléfono</dt><dd>{form.telefono}</dd></div>
                        <div className="ancho-completo"><dt>Planta</dt><dd>{form.direccion_planta}{comuna ? `, ${comuna}` : ''}</dd></div>
                        <div><dt>Potencia</dt><dd>{form.potencia_kw ? `${form.potencia_kw} kW` : 'No indicada'}</dd></div>
                        <div><dt>Baterías</dt><dd>{BATERIAS[form.tiene_baterias]}</dd></div>
                      </dl>
                      <label className="sol-mensaje"><span>Mensaje <span className="opcional">(opcional)</span></span>
                        <textarea name="mensaje" value={form.mensaje} onChange={cambiar} maxLength={500} rows={4}
                          placeholder="Cuéntanos qué necesitas: plan de mantención, una revisión, una falla…" />
                        <span className="sol-contador" aria-live="polite">{form.mensaje.length}/500</span>
                      </label>
                    </>
                  )}

                  <div className="sol-acciones">
                    {paso > 0 ? (
                      <button type="button" className="pub-boton secundario" onClick={() => irA(paso - 1)}>
                        <IconoVolver /> Atrás
                      </button>
                    ) : (
                      <Link className="pub-boton secundario" to="/login"><IconoVolver /> Volver</Link>
                    )}
                    <button type="submit" className="login-entrar" disabled={enviando} aria-busy={enviando}>
                      {enviando && <span className="login-giro" aria-hidden="true" />}
                      {paso < PASOS.length - 1 ? 'Continuar' : enviando ? 'Enviando…' : 'Enviar solicitud'}
                      {!enviando && <IconoFlecha />}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </EscenaPublica>
  );
}

