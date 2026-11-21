// Transiciones de estado permitidas para una orden de mantención (HU-16).
// El técnico termina la visita con fotos y la orden queda 'por_confirmar'; el cliente
// confirma (→ finalizada) o informa que el problema sigue (→ vuelve a en_curso).
// No se admiten saltos y solo se cancela una orden abierta.
export const TRANSICIONES = {
  pendiente: ['en_curso', 'cancelada'],
  en_curso: ['por_confirmar', 'cancelada'],
  por_confirmar: ['finalizada', 'en_curso'],
  finalizada: [],
  cancelada: [],
};

export const puedeTransitar = (desde, hacia) => TRANSICIONES[desde]?.includes(hacia) ?? false;

// El técnico no decide sobre una orden por confirmar: solo el cliente la confirma o la reabre
export const puedeTransitarTecnico = (desde, hacia) => desde !== 'por_confirmar' && puedeTransitar(desde, hacia);
