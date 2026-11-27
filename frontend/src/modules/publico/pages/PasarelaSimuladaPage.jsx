// ============================================================================
// PANTALLA: Pasarela simulada · URL /pasarela-simulada?token=… · Rol: público (token de 30 min)
// Casos de uso: CU-09 (paso 2: «tarjeta» de prueba; últimos 4 = 0000 fuerza un rechazo en el cobro)
// Datos: confirmarPasarela() → POST /api/pagos/simulada/confirmar → pagos.service.js · confirmarInscripcionSimulada()
// Patrón: useState (datos/error) → cargar() pide a la API → render. Tras guardar, se vuelve a cargar().
// Los textos que ves en pantalla están en el JSX de abajo; las reglas están en el backend.
// ============================================================================
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmarPasarela } from '../services/publicoService.js';
import Mensaje from '../../../shared/components/Mensaje.jsx';

// Pasarela de pago SIMULADA para la demostración académica (HU-13).
// Reemplaza al formulario de la pasarela real (Flow sandbox). No se ingresan
// números de tarjeta reales: el formulario entrega solo marca y últimos 4 dígitos.
export default function PasarelaSimuladaPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [marca, setMarca] = useState('Visa');
  const [ultimos4, setUltimos4] = useState('4242');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => { document.title = 'Pasarela de pago (simulada) · ENINTI'; }, []);

  // [CU-09] Aprueba o rechaza la inscripción de la tarjeta de prueba.
  async function confirmar(resultado) {
    setEnviando(true);
    setError(null);
    try {
      const medio = await confirmarPasarela({ token, resultado, marca, ultimos_4: ultimos4 });
      const final = medio?.estado === 'activo' ? 'aprobada' : 'rechazada';
      navigate(`/cliente/cuenta?inscripcion=${final}`, { replace: true });
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
  }

  if (!token) {
    return <main className="acceso"><div className="acceso-tarjeta"><p>Enlace de inscripción inválido.</p></div></main>;
  }

  return (
    <main className="acceso">
      <div className="acceso-tarjeta">
        <h1 className="acceso-marca">Inscripción de tarjeta</h1>
        <p className="acceso-sub">Ambiente de prueba (sandbox). No uses una tarjeta real.</p>

        <div className="banner-sandbox">
          Esta es una pasarela <strong>simulada</strong> para la demostración.
          <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem' }}>
            <li><strong>0000</strong>: la pasarela rechaza la tarjeta.</li>
            <li><strong>0002</strong>: la tarjeta se inscribe, pero los cobros mensuales se rechazan.</li>
            <li>Cualquier otro número: la tarjeta se inscribe y se cobra bien.</li>
          </ul>
        </div>

        <form className="formulario-simple" onSubmit={(e) => { e.preventDefault(); confirmar('aprobada'); }}>
          <Mensaje error={error} />
          <label>
            Marca
            <select value={marca} onChange={(e) => setMarca(e.target.value)}>
              <option>Visa</option><option>Mastercard</option><option>American Express</option>
            </select>
          </label>
          <label>
            Últimos 4 dígitos
            <input value={ultimos4} onChange={(e) => setUltimos4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric" maxLength={4} required />
          </label>
          <button type="submit" className="boton" disabled={enviando || ultimos4.length !== 4}>
            {enviando ? 'Procesando…' : 'Inscribir tarjeta'}
          </button>
          <button type="button" className="boton secundario" disabled={enviando} onClick={() => confirmar('rechazada')}>
            Simular rechazo
          </button>
        </form>
      </div>
    </main>
  );
}
