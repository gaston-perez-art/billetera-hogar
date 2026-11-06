// Dato curioso del reverso de Reparto: en qué parte de la distribución del ingreso está el hogar.
//
// Fuente: INDEC, "Evolución de la distribución del ingreso (EPH)", primer trimestre de 2026.
// Cuadro 7, "Hogares según escala de ingreso total familiar", 31 aglomerados urbanos.
// https://www.indec.gob.ar/uploads/informesdeprensa/ingresos1trim26536C8EDD3E.pdf
// Al actualizar: reemplazar PERIODO, DESDE_DECIL y PROMEDIO_HOGAR con el informe nuevo.

export const PERIODO = "1er trimestre de 2026";
export const FUENTE_URL = "https://www.indec.gob.ar/uploads/informesdeprensa/ingresos1trim26536C8EDD3E.pdf";

/** Ingreso total familiar mensual desde el que empieza cada decil (1 a 10). */
const DESDE_DECIL = [12_000, 600_000, 853_000, 1_060_000, 1_310_000, 1_600_000, 1_919_000, 2_400_000, 3_000_000, 4_120_000];

/** Ingreso total familiar medio de los hogares con ingresos. */
export const PROMEDIO_HOGAR = 2_158_772;

/** Decil (1 a 10) en el que cae un ingreso total familiar mensual. */
export function decilHogar(ingreso: number): number {
  let decil = 1;
  for (let i = 0; i < DESDE_DECIL.length; i++) if (ingreso >= DESDE_DECIL[i]) decil = i + 1;
  return decil;
}

/** Frase para el reverso de la tarjeta. */
export function datoCurioso(ingreso: number): { titulo: string; detalle: string } {
  const decil = decilHogar(ingreso);
  const veces = ingreso / PROMEDIO_HOGAR;
  const titulo =
    decil === 10
      ? "Están en el 10% de hogares que más gana"
      : decil >= 6
        ? `Ganan más que el ${(decil - 1) * 10}% de los hogares`
        : `Están en el ${decil * 10}% de hogares que menos gana`;
  const comparacion =
    veces >= 1.15
      ? `${veces.toLocaleString("es-AR", { maximumFractionDigits: 1 })} veces lo que entra en un hogar promedio`
      : veces <= 0.85
        ? "menos de lo que entra en un hogar promedio"
        : "más o menos lo que entra en un hogar promedio";
  return {
    titulo,
    detalle: `Es ${comparacion} de las ciudades del país, según el INDEC (${PERIODO}). Los montos del INDEC son de ese trimestre: con la inflación, hoy serían más altos.`,
  };
}
