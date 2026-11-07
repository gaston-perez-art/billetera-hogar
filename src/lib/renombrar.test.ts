import { describe, expect, it } from "vitest";
import { renombrarCategoria, renombrarIngreso } from "./operaciones";
import type { Datos } from "./tipos";

const base: Datos = {
  miembros: [{ id: "g", nombre: "Gastón" }],
  categorias: [
    { id: "c1", nombre: "Super", orden: 1, techo: 100 },
    { id: "c2", nombre: "Deuda", orden: 2, techo: 0 },
  ],
  ingresos: [
    { id: "i1", miembroId: "g", concepto: "Sueldo", monto: 10, mes: null, hasta: "2026-09-01" },
    { id: "i2", miembroId: "g", concepto: "Sueldo", monto: 12, mes: null, desde: "2026-10-01" },
    { id: "i3", miembroId: "g", concepto: "Aguinaldo", monto: 5, mes: "2026-12-01" },
  ],
  movimientos: [{ id: "m1", fecha: "2026-11-01", monto: 50, categoriaId: "c1", detalle: "", pagoPor: "g", creadoEn: "" }],
  pagosFijos: [],
  pagosMes: [],
};

describe("cambiar nombres", () => {
  it("renombra la categoría sin tocar techo ni gastos", () => {
    const d = renombrarCategoria(base, "c1", "  Súper y comida ");
    expect(d.categorias[0]).toMatchObject({ nombre: "Súper y comida", techo: 100 });
    expect(d.movimientos[0].categoriaId).toBe("c1");
  });
  it("no renombra las categorías que la app usa por nombre", () => {
    expect(renombrarCategoria(base, "c2", "Préstamos")).toBe(base);
  });
  it("renombra el sueldo en todas sus versiones, no el aguinaldo", () => {
    const d = renombrarIngreso(base, "i2", "Sueldo Galicia");
    expect(d.ingresos.map((i) => i.concepto)).toEqual(["Sueldo Galicia", "Sueldo Galicia", "Aguinaldo"]);
    expect(d.ingresos.map((i) => i.monto)).toEqual([10, 12, 5]);
  });
  it("un nombre vacío no cambia nada", () => {
    expect(renombrarIngreso(base, "i1", "  ")).toBe(base);
  });
});
