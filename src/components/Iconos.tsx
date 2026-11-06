// Íconos de línea propios (24×24, trazo 1.6). Todos en el mismo tono: la categoría
// se reconoce por la forma, no por el color.

type Trazo = string | string[];

const TRAZOS: Record<string, Trazo> = {
  super: ["M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2", "M9 20h.01M17 20h.01"],
  delivery: ["M4 8h16l-1.5 11a1 1 0 0 1-1 .9h-11a1 1 0 0 1-1-.9z", "M9 8V6a3 3 0 0 1 6 0v2"],
  nafta: ["M4 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M3 20h11M4 10h9", "M13 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3"],
  uber: ["M5 16v2M19 16v2M4 16h16v-4l-2-5H6l-2 5z", "M4 12h16"],
  casa: ["M3 11l9-7 9 7", "M5 10v10h14V10M10 20v-5h4v5"],
  izan: ["M12 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", "M8 21v-6l-2-3 3-2h6l3 2-2 3v6"],
  santino: ["M7 8V6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2", "M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z", "M9 13h6"],
  entrenamientos: ["M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"],
  salud: ["M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"],
  personal: ["M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"],
  deuda: ["M3 6h18v12H3z", "M3 10h18M7 15h4"],
  salidas: ["M8 3h8l-1 7a3 3 0 0 1-6 0z", "M12 13v7M8 21h8"],
  jardin: ["M4 20h16M6 20V10l6-5 6 5v10", "M10 20v-4h4v4"],
  seguro: ["M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"],
  otros: ["M5 12h.01M12 12h.01M19 12h.01"],
  chicos: ["M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M3 20a5 5 0 0 1 10 0M11 20a5 5 0 0 1 10 0"],
  entra: ["M12 19V5M6 11l6-6 6 6"],
};

const CATEGORIAS: Record<string, keyof typeof TRAZOS> = {
  "super y comida": "super",
  delivery: "delivery",
  "nafta y transporte": "nafta",
  uber: "uber",
  "casa y servicios": "casa",
  izan: "izan",
  santino: "santino",
  chicos: "chicos",
  entrenamientos: "entrenamientos",
  salud: "salud",
  personal: "personal",
  deuda: "deuda",
  "salidas con jime": "salidas",
  jardin: "jardin",
  "seguro del auto": "seguro",
  otros: "otros",
};

function normalizar(nombre: string) {
  return nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function Icono({ trazo, className = "size-5" }: { trazo: Trazo; className?: string }) {
  const paths = Array.isArray(trazo) ? trazo : [trazo];
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/**
 * Círculo con borde fino y el ícono en línea, sin relleno (como MP): liviano a la vista.
 * Lo que entra lleva el ícono en verde. Si no conoce la categoría, muestra la inicial.
 */
export function IconoCategoria({ nombre, tamano = "md", entra = false }: { nombre: string; tamano?: "md" | "lg"; entra?: boolean }) {
  const clave = entra ? "entra" : CATEGORIAS[normalizar(nombre)];
  const caja = tamano === "lg" ? "size-14" : "size-11";
  return (
    <span className={`grid shrink-0 place-items-center rounded-full border-[1.5px] border-linea ${entra ? "text-queda" : "text-texto"} ${caja}`}>
      {clave ? (
        <Icono trazo={TRAZOS[clave]} className={tamano === "lg" ? "size-6" : "size-5"} />
      ) : (
        <span className="text-[15px] font-semibold">{nombre.charAt(0).toUpperCase()}</span>
      )}
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
  reparto: ["M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7M22 21a7 7 0 0 0-4-6.3"],
  check: "M5 12.5l4.5 4.5L19 7",
  ojo: ["M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  ojoTachado: ["M3 3l18 18", "M10.6 5.6A10.6 10.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.6 6.6C3.9 8.4 2.5 12 2.5 12s3.5 6.5 9.5 6.5a9.6 9.6 0 0 0 4.5-1.1", "M9.9 9.9a3 3 0 0 0 4.2 4.2"],
  archivo: ["M14 3H6v18h12V7z", "M14 3v4h4M12 11v6M9 14l3 3 3-3"],
} satisfies Record<string, Trazo>;
