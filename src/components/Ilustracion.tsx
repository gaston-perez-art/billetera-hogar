// Ilustración del recordatorio: billetera verde con volumen, un ticket que asoma
// y monedas doradas flotando. SVG en línea (sin imágenes externas), con luces y sombras
// para que se lea en 3D. El verde sale de los tokens (se adapta a claro y oscuro);
// el dorado de las monedas es lo único fuera de la paleta y vive solo acá.

export function IlustracionRecordatorio() {
  return (
    <div className="relative h-[176px] overflow-hidden bg-marca-suave">
      <svg viewBox="0 0 360 176" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <radialGradient id="ilu-halo" cx="50%" cy="58%" r="55%">
            <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ilu-brillo" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.22" />
          </linearGradient>
          <linearGradient id="ilu-sombra-cierre" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.05" />
            <stop offset="1" stopColor="#000" stopOpacity="0.28" />
          </linearGradient>
          <linearGradient id="ilu-ticket" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e9eeeb" />
          </linearGradient>
          <radialGradient id="ilu-oro" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#fff3c4" />
            <stop offset="0.45" stopColor="#f2c14e" />
            <stop offset="1" stopColor="#b9821a" />
          </radialGradient>
          <linearGradient id="ilu-canto" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a8740f" />
            <stop offset="1" stopColor="#d9a335" />
          </linearGradient>
          <filter id="ilu-desenfoque" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <rect width="360" height="176" fill="url(#ilu-halo)" />
        {/* Destellos */}
        <path d="M64 46l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" style={{ fill: "var(--color-marca)" }} opacity="0.35" />
        <path d="M300 118l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" style={{ fill: "var(--color-marca)" }} opacity="0.4" />
        <circle cx="96" cy="128" r="3" style={{ fill: "var(--color-marca)" }} opacity="0.25" />

        {/* Sombra en el piso */}
        <ellipse cx="180" cy="158" rx="78" ry="9" fill="#000" opacity="0.18" filter="url(#ilu-desenfoque)" />

        {/* Ticket que asoma */}
        <g transform="rotate(-9 168 70)">
          <path d="M138 30 l6 -5 6 5 6 -5 6 5 6 -5 6 5 6 -5 6 5 v80 h-48z" fill="url(#ilu-ticket)" />
          <path d="M147 46h30M147 56h22M147 66h28" stroke="#b9c2bd" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* Billetera */}
        <rect x="112" y="72" width="140" height="84" rx="20" style={{ fill: "var(--color-marca)" }} />
        <rect x="112" y="72" width="140" height="84" rx="20" fill="url(#ilu-brillo)" />
        <path d="M124 80h116" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round" />
        {/* Cierre */}
        <rect x="204" y="98" width="56" height="34" rx="14" style={{ fill: "var(--color-marca)" }} />
        <rect x="204" y="98" width="56" height="34" rx="14" fill="url(#ilu-sombra-cierre)" />
        <circle cx="226" cy="115" r="6.5" fill="url(#ilu-oro)" />

        {/* Moneda de canto, atrás */}
        <g transform="translate(92 74) rotate(-18)">
          <rect x="-15" y="-2" width="30" height="8" rx="4" fill="url(#ilu-canto)" />
          <ellipse cx="0" cy="-2" rx="15" ry="7" fill="url(#ilu-oro)" />
        </g>

        {/* Moneda grande, adelante */}
        <g transform="translate(270 58)">
          <circle r="27" fill="url(#ilu-canto)" transform="translate(3 3)" />
          <circle r="27" fill="url(#ilu-oro)" />
          <circle r="20" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.5" />
          <text y="9" textAnchor="middle" fontSize="26" fontWeight="800" fill="#8a5d0a" fillOpacity="0.85" fontFamily="var(--font-manrope), sans-serif">
            $
          </text>
          <ellipse cx="-9" cy="-12" rx="7" ry="4" fill="#fff" opacity="0.5" transform="rotate(-30 -9 -12)" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Sello de logro (todos los pagos fijos del mes hechos): círculo verde con el check,
 * un aro suave alrededor y destellos. Solo tokens: se adapta a claro y oscuro.
 */
export function SelloLogro() {
  return (
    <svg viewBox="0 0 120 120" className="sello-entra mx-auto size-28" aria-hidden>
      <defs>
        <linearGradient id="sello-brillo" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="54" style={{ fill: "var(--color-marca-suave)" }} />
      <circle cx="60" cy="60" r="38" style={{ fill: "var(--color-marca)" }} />
      <circle cx="60" cy="60" r="38" fill="url(#sello-brillo)" />
      <path d="M44 61l11 11 21-23" fill="none" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--color-sobre-marca)" }} />
      <path d="M100 14l2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5z" style={{ fill: "var(--color-marca)" }} opacity="0.7" />
      <path d="M16 86l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" style={{ fill: "var(--color-marca)" }} opacity="0.5" />
      <circle cx="18" cy="26" r="3" style={{ fill: "var(--color-marca)" }} opacity="0.35" />
      <circle cx="104" cy="96" r="2.5" style={{ fill: "var(--color-marca)" }} opacity="0.4" />
    </svg>
  );
}
