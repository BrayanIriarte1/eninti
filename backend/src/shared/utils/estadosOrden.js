// Transiciones de estado permitidas para una orden de mantención (HU-16).
// No se admiten saltos: pendiente → en_curso → finalizada; cancelar solo desde estados abiertos.
export const TRANSICIONES = {
  pendiente: ['en_curso', 'cancelada'],
  en_curso: ['finalizada', 'cancelada'],
  finalizada: [],
  cancelada: [],
};

export const puedeTransitar = (desde, hacia) => TRANSICIONES[desde]?.includes(hacia) ?? false;
