// Etiqueta de color con el estado de una orden (la usan el técnico y el calendario del administrador)
const ESTADO_ORDEN = {
  pendiente: { texto: 'Pendiente', clase: 'neutro' },
  en_curso: { texto: 'En curso', clase: 'alerta' },
  por_confirmar: { texto: 'Esperando al cliente', clase: 'aviso' },
  finalizada: { texto: 'Finalizada', clase: 'ok' },
  cancelada: { texto: 'Cancelada', clase: 'neutro' },
};

export function EtiquetaOrden({ estado }) {
  const e = ESTADO_ORDEN[estado] ?? { texto: estado, clase: 'neutro' };
  return <span className={`etiqueta ${e.clase}`}>{e.texto}</span>;
}
