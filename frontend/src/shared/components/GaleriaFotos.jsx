import { useEffect, useState } from 'react';

// Miniaturas de las fotos de una orden; al tocar una se abre en grande (Escape o clic para cerrar)
export default function GaleriaFotos({ fotos, onQuitar }) {
  const [abierta, setAbierta] = useState(null);

  useEffect(() => {
    if (abierta === null) return undefined;
    const cerrar = (e) => e.key === 'Escape' && setAbierta(null);
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [abierta]);

  if (!fotos?.length) return null;
  return (
    <>
      <ul className="galeria">
        {fotos.map((url, i) => (
          <li key={i}>
            <button type="button" className="galeria-mini" onClick={() => setAbierta(i)} aria-label={`Ver foto ${i + 1} en grande`}>
              <img src={url} alt={`Foto ${i + 1} del trabajo realizado`} loading="lazy" />
            </button>
            {onQuitar && (
              <button type="button" className="galeria-quitar" onClick={() => onQuitar(i)} aria-label={`Quitar foto ${i + 1}`}>×</button>
            )}
          </li>
        ))}
      </ul>
      {abierta !== null && (
        <div className="visor" role="dialog" aria-modal="true" aria-label="Foto en grande" onClick={() => setAbierta(null)}>
          <img src={fotos[abierta]} alt={`Foto ${abierta + 1} del trabajo realizado`} />
          <button type="button" className="visor-cerrar" aria-label="Cerrar">×</button>
        </div>
      )}
    </>
  );
}
