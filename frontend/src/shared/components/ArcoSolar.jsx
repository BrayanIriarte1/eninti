import { useEffect, useState } from 'react';

// Recorrido aproximado del sol en la Región de Antofagasta (amanecer ~7:00, atardecer ~20:00)
const AMANECER = 7;
const ATARDECER = 20;

function horaDecimal(fecha) {
  return fecha.getHours() + fecha.getMinutes() / 60;
}

// Posición del sol sobre un semicírculo según la hora; de noche queda bajo el horizonte.
function posicion(hora) {
  const t = Math.min(1, Math.max(0, (hora - AMANECER) / (ATARDECER - AMANECER)));
  const angulo = Math.PI * (1 - t);
  const dia = hora >= AMANECER && hora <= ATARDECER;
  return { x: 160 + 130 * Math.cos(angulo), y: 140 - 120 * Math.sin(angulo), dia, t };
}

// Encabezado de las pantallas de inicio: saludo, fecha y el arco del sol del día.
// El sol se mueve a su posición al cargar y luego avanza con el reloj.
export default function ArcoSolar({ titulo, children }) {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const p = posicion(horaDecimal(ahora));
  const largoArco = Math.PI * 130;
  const fecha = ahora.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  const hora = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  return (
    <header className="arco">
      <div className="arco-texto">
        <p className="arco-fecha">{fecha}</p>
        <h1>{titulo}</h1>
        {children && <div className="arco-extra">{children}</div>}
      </div>
      <svg className="arco-dibujo" viewBox="0 0 320 160" role="img"
        aria-label={p.dia ? `Sol del día: ${hora}, ${Math.round(p.t * 100)} % de las horas de luz` : `Noche: ${hora}`}>
        <path d="M30 140 A130 120 0 0 1 290 140" className="arco-camino" />
        <path d="M30 140 A130 120 0 0 1 290 140" className="arco-recorrido"
          style={{ strokeDasharray: largoArco, strokeDashoffset: largoArco * (1 - p.t) }} />
        <line x1="10" y1="140" x2="310" y2="140" className="arco-horizonte" />
        <path d="M10 140 L70 118 L105 128 L150 104 L196 126 L236 112 L310 140 Z" className="arco-cerros" />
        <g className={`arco-sol ${p.dia ? '' : 'arco-sol-noche'}`} style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
          <circle r="15" className="arco-halo" />
          <circle r="8.5" className="arco-nucleo" />
        </g>
        <text x="30" y="156" className="arco-hora">7:00</text>
        <text x="290" y="156" textAnchor="end" className="arco-hora">20:00</text>
      </svg>
    </header>
  );
}
