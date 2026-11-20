// Logotipo de ENINTI: sol sobre un panel solar
export default function Marca() {
  return (
    <span className="marca">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <circle cx="16" cy="12" r="6" className="marca-sol" />
        <path d="M3 27h26l-3.5-8h-19z" className="marca-panel" />
        <path d="M11.5 19l-1 8M16 19v8M20.5 19l1 8M5 23h22" className="marca-lineas" />
      </svg>
      ENINTI
    </span>
  );
}
