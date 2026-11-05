// Muestra un error de la API con sus detalles de validación
export default function Mensaje({ error }) {
  if (!error) return null;
  const detalles = Array.isArray(error.detalles) ? error.detalles : [];
  return (
    <div className="mensaje-error" role="alert">
      <strong>{error.message}</strong>
      {detalles.length > 0 && (
        <ul>
          {detalles.map((d) => <li key={d}>{d}</li>)}
        </ul>
      )}
    </div>
  );
}
