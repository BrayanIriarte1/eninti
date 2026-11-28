// ============================================================================
// PANTALLA: Cotizador · URL /cotizador · Rol: público (sin sesión)
// Casos de uso: CU-01
// Datos: catalogoPublico() → GET /api/publico/catalogo → catalogo.service.js · listarPublico()
// Patrón: useState (datos/error) → cargar() pide a la API → render. Tras guardar, se vuelve a cargar().
// Los textos que ves en pantalla están en el JSX de abajo; las reglas están en el backend.
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EscenaPublica, { PortadaPublica } from '../components/EscenaPublica.jsx';
import { catalogoPublico } from '../services/publicoService.js';
import { formatoPesos } from '../../../shared/utils/formato.js';
import { enlaceWhatsapp } from '../../../shared/utils/contacto.js';
import {
  IconoBateria, IconoCalendario, IconoCamara, IconoCheck, IconoFlecha, IconoGrafico,
  IconoHerramienta, IconoMas, IconoPanel, IconoRayo, IconoTarjeta, IconoUsuario, IconoWhatsapp,
} from '../components/IconosPublicos.jsx';

// Lo que trae cualquier plan: son funciones reales de la plataforma
const INCLUYE = [
  { icono: <IconoCalendario />, texto: 'Mantenciones preventivas programadas por ENINTI' },
  { icono: <IconoPanel />, texto: 'Ficha e historial técnico de tu planta en línea' },
  { icono: <IconoCamara />, texto: 'Confirmas cada visita con fotos del trabajo realizado' },
  { icono: <IconoTarjeta />, texto: 'Estado de cuenta y pago mensual con tarjeta inscrita' },
];

const PASOS = [
  { icono: <IconoUsuario />, titulo: 'Solicita tu cuenta', texto: 'Nos dejas tus datos y los de tu planta en un formulario de 2 minutos.' },
  { icono: <IconoCheck />, titulo: 'Activamos tu plan', texto: 'El administrador revisa tu planta, crea tu cuenta y te envía el acceso.' },
  { icono: <IconoRayo />, titulo: 'Tu planta rinde', texto: 'Programamos las visitas y tú sigues todo desde la plataforma.' },
];

const PREGUNTAS = [
  ['¿Cómo se paga el plan?', 'Con una cuota mensual. Desde tu cuenta inscribes una tarjeta y el cobro se hace solo cada mes; también ves tus cuotas pagadas y pendientes.'],
  ['¿Qué pasa si me atraso en un pago?', 'Tu suscripción sigue activa pero queda con deuda, y vuelve a estar al día apenas pagas. Si la deuda supera un mes, la suscripción se cancela por morosidad.'],
  ['¿Puedo cancelar cuando quiera?', 'Sí, desde tu cuenta. Las cuotas futuras se anulan y no se programan más visitas preventivas.'],
  ['¿Los repuestos están incluidos?', 'No. Los servicios y el plan cubren la mano de obra; si hace falta un repuesto te lo cotizamos por separado antes de instalarlo.'],
  ['¿Y si no tengo plan?', 'Puedes contratar servicios puntuales, como una visita correctiva. Las mantenciones preventivas programadas son parte del plan.'],
];

// Ícono según el nombre del servicio del catálogo (el catálogo lo administra ENINTI)
function iconoServicio(nombre) {
  const n = nombre.toLowerCase();
  if (n.includes('bater')) return <IconoBateria />;
  if (n.includes('informe') || n.includes('rendimiento')) return <IconoGrafico />;
  if (n.includes('emergencia') || n.includes('correctiv')) return <IconoRayo />;
  return <IconoHerramienta />;
}

// Planes y servicios con cotizador (RNF-07), sin autenticación
export default function CotizadorPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  // La cotización parte vacía: solo contiene lo que el visitante agrega (no se preselecciona un plan)
  const [plan, setPlan] = useState(null);
  const [elegidos, setElegidos] = useState(() => new Set());

  useEffect(() => {
    catalogoPublico()
      .then(setItems)
      .catch(() => setError(true));
  }, []);

  const planes = useMemo(() => (items ?? []).filter((i) => i.tipo === 'plan'), [items]);
  const servicios = useMemo(
    () => (items ?? []).filter((i) => i.tipo === 'servicio').sort((a, b) => a.precio - b.precio),
    [items],
  );
  const planElegido = planes.find((p) => p.id_item === plan);
  const serviciosElegidos = servicios.filter((s) => elegidos.has(s.id_item));
  const totalUnico = serviciosElegidos.reduce((suma, s) => suma + s.precio, 0);
  const vacia = !planElegido && !serviciosElegidos.length;

  // [CU-01] Agrega/quita un servicio puntual de la cotización.
  function alternarServicio(id) {
    setElegidos((previo) => {
      const nuevo = new Set(previo);
      if (nuevo.has(id)) nuevo.delete(id); else nuevo.add(id);
      return nuevo;
    });
  }

  // Resumen en texto: viaja al formulario de solicitud y al mensaje de WhatsApp
  const resumen = [
    planElegido && `Plan: ${planElegido.nombre} (${formatoPesos(planElegido.precio)}/mes)`,
    ...serviciosElegidos.map((s) => `Servicio: ${s.nombre} (${formatoPesos(s.precio)})`),
  ].filter(Boolean).join('\n');

  return (
    <EscenaPublica titulo="Planes y servicios">
      <PortadaPublica etiqueta="Región de Antofagasta" titulo="Planes y servicios" destacado="sin letra chica.">
        Mantención preventiva por suscripción para sistemas fotovoltaicos, y servicios puntuales
        cuando los necesites. Arma tu cotización y envíala en un clic.
      </PortadaPublica>

      {error && (
        <p className="pub-aviso" role="alert">
          No pudimos cargar el catálogo en este momento. Intenta de nuevo o <Link to="/contacto">contáctanos</Link>.
        </p>
      )}
      {!items && !error && <p className="pub-aviso" role="status">Cargando planes…</p>}

      {items && (
        <div className="cot-grilla">
          <div className="cot-principal">
            <section aria-labelledby="cot-planes">
              <h2 id="cot-planes" className="pub-h2">Plan de suscripción</h2>
              <div className="cot-planes">
                {planes.map((p) => {
                  const activo = p.id_item === plan;
                  return (
                    <article key={p.id_item} className={`cuadro-luz cot-plan ${activo ? 'activo' : ''}`}>
                      <div className="cot-plan-cuerpo">
                        <p className="cot-plan-sello"><IconoRayo tamano={16} /> Suscripción mensual</p>
                        <h3>{p.nombre}</h3>
                        <p className="cot-precio">
                          {formatoPesos(p.precio)}<span>/mes</span>
                        </p>
                        <p className="cot-plan-desc">{p.descripcion}</p>
                        <ul className="cot-incluye">
                          {INCLUYE.map((i) => <li key={i.texto}>{i.icono}{i.texto}</li>)}
                        </ul>
                        <button
                          type="button"
                          className={`pub-boton ${activo ? 'secundario' : ''}`}
                          aria-pressed={activo}
                          onClick={() => setPlan(activo ? null : p.id_item)}
                        >
                          {activo ? <><IconoCheck /> En tu cotización</> : <><IconoMas /> Agregar a mi cotización</>}
                        </button>
                      </div>
                    </article>
                  );
                })}
                {!planes.length && <p className="pub-aviso">Por ahora no hay planes publicados.</p>}
              </div>
            </section>

            <section aria-labelledby="cot-servicios">
              <h2 id="cot-servicios" className="pub-h2">Servicios puntuales</h2>
              <p className="pub-nota">Pago único por visita, con o sin plan. Valores referenciales con IVA incluido.</p>
              <ul className="cot-servicios">
                {servicios.map((s) => {
                  const activo = elegidos.has(s.id_item);
                  return (
                    <li key={s.id_item}>
                      <button
                        type="button"
                        className={`cot-servicio ${activo ? 'activo' : ''}`}
                        aria-pressed={activo}
                        onClick={() => alternarServicio(s.id_item)}
                      >
                        <span className="cot-servicio-icono">{iconoServicio(s.nombre)}</span>
                        <span className="cot-servicio-texto">
                          <strong>{s.nombre}</strong>
                          <span>{s.descripcion}</span>
                        </span>
                        <span className="cot-servicio-precio">{formatoPesos(s.precio)}</span>
                        <span className="cot-servicio-marca" aria-hidden="true">
                          {activo ? <IconoCheck tamano={16} /> : <IconoMas tamano={16} />}
                        </span>
                        <span className="login-oculto">{activo ? ', en tu cotización' : ', agregar a tu cotización'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <aside className="cot-resumen" aria-labelledby="cot-resumen-titulo">
            <div className="cot-resumen-caja">
              <h2 id="cot-resumen-titulo">Tu cotización</h2>
              {vacia ? (
                <p className="cot-vacia">Elige un plan o servicios para ver el total.</p>
              ) : (
                <ul className="cot-lineas" aria-live="polite">
                  {planElegido && (
                    <li><span>{planElegido.nombre}</span><strong>{formatoPesos(planElegido.precio)}/mes</strong></li>
                  )}
                  {serviciosElegidos.map((s) => (
                    <li key={s.id_item}><span>{s.nombre}</span><strong>{formatoPesos(s.precio)}</strong></li>
                  ))}
                </ul>
              )}
              <dl className="cot-totales">
                <div><dt>Mensual</dt><dd>{formatoPesos(planElegido?.precio ?? 0)}</dd></div>
                <div><dt>Pago único</dt><dd>{formatoPesos(totalUnico)}</dd></div>
              </dl>
              <button
                type="button"
                className="login-entrar"
                disabled={vacia}
                onClick={() => navigate('/solicitar-cuenta', { state: { cotizacion: resumen } })}
              >
                Solicitar con esta cotización <IconoFlecha />
              </button>
              <a
                className="pub-boton whatsapp"
                href={enlaceWhatsapp(`Hola ENINTI, quiero cotizar:\n${resumen || 'un plan de mantención'}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconoWhatsapp /> Consultar por WhatsApp<span className="login-oculto"> (abre en otra pestaña)</span>
              </a>
              <p className="cot-letra">Valores referenciales. Los repuestos se cotizan aparte.</p>
            </div>
          </aside>
        </div>
      )}

      <section className="pub-seccion" aria-labelledby="cot-pasos">
        <h2 id="cot-pasos" className="pub-h2">Cómo funciona</h2>
        <ol className="pub-pasos">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="login-perfil">
              <span className="login-perfil-icono">{p.icono}</span>
              <span>
                <span className="pub-paso-num">Paso {i + 1}</span>
                <strong>{p.titulo}</strong>
                <span className="login-perfil-texto">{p.texto}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="pub-seccion pub-faq" aria-labelledby="cot-faq">
        <h2 id="cot-faq" className="pub-h2">Preguntas frecuentes</h2>
        {PREGUNTAS.map(([pregunta, respuesta]) => (
          <details key={pregunta}>
            <summary>{pregunta}</summary>
            <p>{respuesta}</p>
          </details>
        ))}
        <p className="pub-nota">¿Otra duda? <Link to="/contacto">Habla con un administrador</Link>.</p>
      </section>
    </EscenaPublica>
  );
}
