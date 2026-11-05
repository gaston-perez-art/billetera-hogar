// Importar datos desde un archivo JSON (mismo formato que guarda la app).
// Sirve para cargar datos reales en el celular sin que pasen por el repo, que es público.

import type { Datos } from "./tipos";

const LISTAS = ["miembros", "categorias", "ingresos", "movimientos", "pagosFijos", "pagosMes"] as const;

export function leerDatosImportados(texto: string): Datos {
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    throw new Error("El archivo no es un JSON válido.");
  }
  if (!crudo || typeof crudo !== "object") throw new Error("El archivo no tiene datos de la billetera.");
  const d = crudo as Record<string, unknown>;
  for (const clave of LISTAS) {
    if (!Array.isArray(d[clave])) throw new Error(`Falta la lista "${clave}" en el archivo.`);
  }
  const datos = d as unknown as Datos;
  if (datos.miembros.length === 0) throw new Error("El archivo no tiene miembros.");
  const categorias = new Set(datos.categorias.map((c) => c.id));
  const miembros = new Set(datos.miembros.map((m) => m.id));
  for (const m of datos.movimientos) {
    if (!categorias.has(m.categoriaId)) throw new Error(`El gasto "${m.detalle}" tiene una categoría que no existe.`);
    if (!miembros.has(m.pagoPor)) throw new Error(`El gasto "${m.detalle}" lo pagó alguien que no es del hogar.`);
    if (typeof m.monto !== "number" || !/^\d{4}-\d{2}-\d{2}$/.test(m.fecha)) {
      throw new Error(`El gasto "${m.detalle}" tiene monto o fecha inválidos.`);
    }
  }
  return datos;
}
