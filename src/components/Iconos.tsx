// Íconos de línea propios (24×24, trazo 1.8). Cada categoría tiene ícono y tono.

type Trazo = string | string[];

const TRAZOS: Record<string, Trazo> = {
  super: ["M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2", "M9 20h.01M17 20h.01"],
  delivery: ["M5 18a2 2 0 1 0 0-.01M19 18a2 2 0 1 0 0-.01", "M7 18h8l2-6h-5l-2-4H7", "M14 6h3l2 6"],
  nafta: ["M4 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M3 20h11M4 10h9", "M13 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3"],
  uber: ["M5 16v2M19 16v2M4 16h16v-4l-2-5H6l-2 5z", "M4 12h16M7.5 14h.01M16.5 14h.01"],
  casa: ["M3 11l9-7 9 7", "M5 10v10h14V10M10 20v-5h4v5"],
  izan: ["M12 21c4.4 0 8-3 8-7.5S16.4 5 12 5 4 9 4 13.5 7.6 21 12 21z", "M9.5 12h.01M14.5 12h.01M10 16c1.2 1 2.8 1 4 0M12 5V3"],
  santino: ["M7 8V6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2", "M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z", "M9 13h6"],
  entrenamientos: ["M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"],
  salud: ["M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"],
  personal: ["M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"],
  deuda: ["M3 6h18v12H3z", "M3 10h18M7 15h4"],
  salidas: ["M8 3h8l-1 7a3 3 0 0 1-6 0z", "M12 13v7M8 21h8"],
  jardin: ["M4 20h16M6 20V10l6-5 6 5v10", "M10 20v-4h4v4M12 8.5h.01"],
  seguro: ["M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z", "M9 12l2 2 4-4"],
  otros: ["M6 12h.01M12 12h.01M18 12h.01"],
  chicos: ["M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M3 20a5 5 0 0 1 10 0M11 20a5 5 0 0 1 10 0"],
};

// Tonos suaves de fondo + color del trazo. Pocos tonos, repetidos con criterio.
const TONOS = {
  verde: "bg-[#e2f3e9] text-[#17804f]",
  arena: "bg-[#f6eedd] text-[#9a6a12]",
  cielo: "bg-[#e3edf7] text-[#2c5f8f]",
  coral: "bg-[#fbe9e5] text-[#b5432f]",
  lila: "bg-[#ece8f6] text-[#5e4b98]",
  piedra: "bg-[#eceeeb] text-[#4d5752]",
} as const;

const CATEGORIAS: Record<string, { icono: keyof typeof TRAZOS; tono: keyof typeof TONOS }> = {
  "super y comida": { icono: "super", tono: "verde" },
  delivery: { icono: "delivery", tono: "coral" },
  "nafta y transporte": { icono: "nafta", tono: "cielo" },
  uber: { icono: "uber", tono: "cielo" },
  "casa y servicios": { icono: "casa", tono: "arena" },
  izan: { icono: "izan", tono: "lila" },
  santino: { icono: "santino", tono: "lila" },
  chicos: { icono: "chicos", tono: "lila" },
  entrenamientos: { icono: "entrenamientos", tono: "verde" },
  salud: { icono: "salud", tono: "coral" },
  personal: { icono: "personal", tono: "piedra" },
  deuda: { icono: "deuda", tono: "piedra" },
  "salidas con jime": { icono: "salidas", tono: "coral" },
  jardin: { icono: "jardin", tono: "arena" },
  "seguro del auto": { icono: "seguro", tono: "cielo" },
  otros: { icono: "otros", tono: "piedra" },
};

function normalizar(nombre: string) {
  return nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function Icono({ trazo, className = "size-5" }: { trazo: Trazo; className?: string }) {
  const paths = Array.isArray(trazo) ? trazo : [trazo];
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Círculo con el ícono de la categoría. Si no la conoce, muestra la inicial. */
export function IconoCategoria({ nombre, tamano = "md" }: { nombre: string; tamano?: "sm" | "md" | "lg" }) {
  const def = CATEGORIAS[normalizar(nombre)];
  const caja = tamano === "lg" ? "size-14" : tamano === "sm" ? "size-9" : "size-11";
  const icono = tamano === "lg" ? "size-6" : tamano === "sm" ? "size-[18px]" : "size-5";
  const tono = TONOS[def?.tono ?? "piedra"];
  return (
    <span className={`grid shrink-0 place-items-center rounded-full ${caja} ${tono}`}>
      {def ? <Icono trazo={TRAZOS[def.icono]} className={icono} /> : <span className="text-sm font-semibold">{nombre.charAt(0)}</span>}
    </span>
  );
}

export const ICONOS = {
  atras: "M15 6l-6 6 6 6",
  adelante: "M9 6l6 6-6 6",
  mas: "M12 5v14M5 12h14",
  cerrar: "M6 6l12 12M18 6L6 18",
  ajustes: ["M4 7h10M18 7h2M4 17h4M12 17h8", "M16 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM10 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"],
  inicio: ["M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z"],
  categorias: ["M5 20V12M12 20V5M19 20v-9"],
  pagos: ["M4 6h16v14H4z", "M4 10h16M9 3v5M15 3v5"],
  reparto: ["M12 3v18", "M7 7a5 5 0 0 0 0 10M17 7a5 5 0 0 1 0 10"],
  check: "M5 12.5l4.5 4.5L19 7",
  basura: ["M4 7h16M10 11v6M14 11v6", "M6 7l1 13h10l1-13M9 7V4h6v3"],
  archivo: ["M14 3H6v18h12V7z", "M14 3v4h4M12 11v6M9 14l3 3 3-3"],
} satisfies Record<string, Trazo>;
