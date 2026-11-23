import { useState } from 'react';
import Mensaje from './Mensaje.jsx';

// Mismas reglas que el backend (auth/contrasena.service.js): se muestran mientras se escribe
const REQUISITOS = [
  { texto: 'Al menos 8 caracteres', cumple: (p) => p.length >= 8 },
  { texto: 'Letras y números', cumple: (p) => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(p) && /\d/.test(p) },
];

// Formulario de contraseña nueva, con la actual opcional (cambiar) o sin ella (restablecer).
// onEnviar({ actual, nueva }) debe lanzar el error de la API para mostrarlo aquí.
export default function FormularioContrasena({ pedirActual = false, textoBoton = 'Guardar contraseña', onEnviar, claseBoton = 'boton' }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const coincide = repetir.length > 0 && nueva === repetir;
  const valida = REQUISITOS.every((r) => r.cumple(nueva)) && coincide;

  async function enviar(e) {
    e.preventDefault();
    if (!valida) return;
    setEnviando(true);
    setError(null);
    try {
      await onEnviar({ actual, nueva });
      setActual('');
      setNueva('');
      setRepetir('');
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  }

  const tipo = ver ? 'text' : 'password';

  return (
    <form className="formulario-simple form-contrasena" onSubmit={enviar}>
      <Mensaje error={error} />
      {pedirActual && (
        <label>Contraseña actual
          <input type={tipo} value={actual} onChange={(e) => setActual(e.target.value)} required autoComplete="current-password" />
        </label>
      )}
      <label>Contraseña nueva
        <input type={tipo} value={nueva} onChange={(e) => setNueva(e.target.value)} required autoComplete="new-password"
          maxLength={128} aria-describedby="requisitos-contrasena" />
      </label>
      <ul id="requisitos-contrasena" className="requisitos" aria-label="Requisitos de la contraseña">
        {REQUISITOS.map((r) => {
          const cumple = r.cumple(nueva);
          return <li key={r.texto} className={cumple ? 'cumple' : ''}>{r.texto}<span className="login-oculto">{cumple ? ': cumplido' : ': pendiente'}</span></li>;
        })}
        <li className={coincide ? 'cumple' : ''}>Ambas coinciden<span className="login-oculto">{coincide ? ': cumplido' : ': pendiente'}</span></li>
      </ul>
      <label>Repite la contraseña nueva
        <input type={tipo} value={repetir} onChange={(e) => setRepetir(e.target.value)} required autoComplete="new-password" maxLength={128} />
      </label>
      <label className="ver-contrasena">
        <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} /> Mostrar contraseñas
      </label>
      <button type="submit" className={claseBoton} disabled={!valida || enviando} aria-busy={enviando}>
        {enviando ? 'Guardando…' : textoBoton}
      </button>
    </form>
  );
}
