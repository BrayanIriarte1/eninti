// Estados de la suscripción. 'al_dia' y 'con_deuda' los calculan las reglas de deuda del backend.
const ESTADOS = {
  al_dia: { texto: 'Al día', clase: 'ok' },
  con_deuda: { texto: 'Activa con deuda', clase: 'aviso' },
  cancelada: { texto: 'Cancelada', clase: 'neutro' },
};

export default function EstadoSuscripcion({ estado }) {
  const { texto, clase } = ESTADOS[estado] ?? { texto: 'Sin suscripción', clase: 'neutro' };
  return <span className={`etiqueta ${clase}`}>{texto}</span>;
}
