import { useId } from 'react';

// Logo de ENINTI en vector: sol con ocho rayos-relámpago y el nombre al centro.
// Redibujado a partir del logo original (sin fondo negro) para que escale nítido
// y no requiera descargar imágenes. `animado` gira los rayos y hace latir el halo.
const RAYO = 'M -8 -50 L 8 -50 L 2 -66 L 9 -66 L -2 -98 L -1 -72 L -9 -72 Z';

export default function LogoEninti({ tamano = 120, animado = false, className = '' }) {
  const id = useId().replace(/:/g, '');

  return (
    <svg
      className={`logo-eninti ${animado ? 'animado' : ''} ${className}`}
      width={tamano}
      height={tamano}
      viewBox="0 0 200 200"
      role="img"
      aria-label="ENINTI"
    >
      <defs>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0%" stopColor="#ffe14d" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#ffb400" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ff7a00" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-rayo`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#fff176" />
          <stop offset="100%" stopColor="#ffd000" />
        </linearGradient>
        <radialGradient id={`${id}-disco`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fffbd1" />
          <stop offset="45%" stopColor="#ffeb3b" />
          <stop offset="100%" stopColor="#ffc400" />
        </radialGradient>
        <linearGradient id={`${id}-aro`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb300" />
          <stop offset="100%" stopColor="#e5261c" />
        </linearGradient>
      </defs>

      <circle className="logo-halo" cx="100" cy="100" r="100" fill={`url(#${id}-halo)`} />

      <g className="logo-rayos">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angulo) => (
          <path
            key={angulo}
            d={RAYO}
            transform={`translate(100 100) rotate(${angulo})`}
            fill={`url(#${id}-rayo)`}
            stroke="#e0461c"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        ))}
      </g>

      <circle cx="100" cy="100" r="44" fill={`url(#${id}-disco)`} stroke={`url(#${id}-aro)`} strokeWidth="6" />
      <text
        x="100"
        y="107"
        textAnchor="middle"
        textLength="72"
        lengthAdjust="spacingAndGlyphs"
        fontFamily="'Arial Black', 'Segoe UI Black', system-ui, sans-serif"
        fontWeight="900"
        fontSize="20"
        fill="#1a1200"
      >
        ENINTI
      </text>
      <text x="122" y="127" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="9" fill="#1a1200">
        ®
      </text>
    </svg>
  );
}
