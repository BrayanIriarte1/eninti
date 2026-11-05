import { useState } from 'react';
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

  async function confirmar(resultado) {
    setEnviando(true);
    setError(null);
    try {
      await confirmarPasarela({ token, resultado, marca, ultimos_4: ultimos4 });
      navigate('/cliente/cuenta', { replace: true });
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
          Esta es una pasarela <strong>simulada</strong> para la demostración. Usa los últimos
          dígitos <strong>0000</strong> para probar un rechazo.
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
