const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

export const formatoPesos = (monto) => clp.format(monto);

// 'YYYY-MM-DD' → 'DD-MM-YYYY' sin pasar por Date (evita desfases de zona horaria)
export const formatoFecha = (fecha) => (fecha ? fecha.split('-').reverse().join('-') : '—');

export const hoy = () => new Date().toLocaleDateString('sv-SE');
