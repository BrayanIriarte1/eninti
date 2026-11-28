const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

export const formatoPesos = (monto) => clp.format(monto);

// 'YYYY-MM-DD' → 'DD-MM-YYYY' sin pasar por Date (evita desfases de zona horaria)
export const formatoFecha = (fecha) => (fecha ? fecha.split('-').reverse().join('-') : '—');

// Marca de tiempo (ISO en UTC, p. ej. fecha_solicitud) → 'DD-MM-YYYY' en hora de Chile.
// No usar formatoFecha(marca.slice(0, 10)): después de las 21:00 de Chile la fecha UTC ya es el día siguiente.
const fechaChile = new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: 'numeric' });
export const fechaDeMarca = (marca) => (marca ? fechaChile.format(new Date(marca)) : '—');

export const hoy = () => new Date().toLocaleDateString('sv-SE');
