// Cuándo mostrar el recordatorio para cargar gastos (ver components/Recordatorio.tsx).

import { hoy } from "./formato";

const HORA_NOCHE = 23;
const DIA_MS = 24 * 60 * 60 * 1000;

export type Motivo = "un-dia" | "noche";

/** Por qué mostrar el recordatorio ahora, o null si no hace falta. Pura, para testear. */
export function motivoRecordatorio(cargas: string[], ahora: Date, cerradoEn: Date | null): Motivo | null {
  const ultima = cargas.reduce<number>((a, c) => Math.max(a, new Date(c).getTime() || 0), 0);
  const hoyLocal = hoy(ahora);
  const cargoHoy = ultima > 0 && hoy(new Date(ultima)) === hoyLocal;
  const cerroHoy = cerradoEn !== null && hoy(cerradoEn) === hoyLocal;
  const esNoche = ahora.getHours() >= HORA_NOCHE;
  const cerroDeNoche = cerroHoy && cerradoEn !== null && cerradoEn.getHours() >= HORA_NOCHE;
  if (esNoche && !cargoHoy && !cerroDeNoche) return "noche";
  if (ahora.getTime() - ultima > DIA_MS && !cerroHoy) return "un-dia";
  return null;
}
