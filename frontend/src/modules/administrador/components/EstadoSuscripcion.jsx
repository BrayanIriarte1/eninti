const ESTADOS = {
  al_dia: { texto: 'Al día', clase: 'ok' },
  morosa: { texto: 'Morosa', clase: 'alerta' },
  cancelada: { texto: 'Cancelada', clase: 'neutro' },
};

export default function EstadoSuscripcion({ estado }) {
  const { texto, clase } = ESTADOS[estado] ?? { texto: 'Sin suscripción', clase: 'neutro' };
  return <span className={`etiqueta ${clase}`}>{texto}</span>;
}
