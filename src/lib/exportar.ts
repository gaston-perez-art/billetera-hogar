// Exportar gastos para la planilla (hoja "Base de datos"), que queda solo para revisar.
// Mismas columnas y orden que esa hoja: Fecha, Monto, Categoría, Detalle, Medio de pago, Pagó.
// Fecha en DD/MM/AAAA y monto con punto decimal: así los lee la planilla (configuración es_MX).

import { fechaCorta } from "./formato";
import type { Datos, Fecha } from "./tipos";

const COLUMNAS = ["Fecha", "Monto", "Categoría", "Detalle", "Medio de pago", "Pagó"];

function celda(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Gastos entre `desde` y `hasta` (los dos incluidos), ordenados por fecha. */
export function gastosEntre(datos: Datos, desde: Fecha, hasta: Fecha) {
  return datos.movimientos
    .filter((m) => m.fecha >= desde && m.fecha <= hasta)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.creadoEn.localeCompare(b.creadoEn));
}

/** CSV listo para importar o pegar en "Base de datos". Pura, para testear. */
export function csvParaPlanilla(datos: Datos, desde: Fecha, hasta: Fecha): string {
  const categoria = new Map(datos.categorias.map((c) => [c.id, c.nombre]));
  const miembro = new Map(datos.miembros.map((m) => [m.id, m.nombre]));
  const filas = gastosEntre(datos, desde, hasta).map((m) =>
    [
      fechaCorta(m.fecha),
      String(Math.round(m.monto * 100) / 100),
      categoria.get(m.categoriaId) ?? "",
      m.detalle ?? "",
      m.medio ?? "",
      miembro.get(m.pagoPor) ?? "",
    ]
      .map(celda)
      .join(","),
  );
  return [COLUMNAS.join(","), ...filas].join("\r\n") + "\r\n";
}

/** Nombre del archivo: `billetera-2026-11-01-a-2026-11-30.csv`. */
export function nombreArchivo(desde: Fecha, hasta: Fecha): string {
  return `billetera-${desde}-a-${hasta}.csv`;
}
