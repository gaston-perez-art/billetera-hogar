import { describe, expect, it } from "vitest";
import { acumuladoApp, comparar } from "./banco";
import { datosDemo } from "./demo";
import type { Datos } from "./tipos";

const FECHA = "2026-11-12";
const demo = () => datosDemo(FECHA);
const gasto = (d: Datos, fecha: string, monto: number, nombreCat?: string): Datos => {
  const cat = d.categorias.find((c) => (nombreCat ? c.nombre === nombreCat : c.nombre !== "Ahorro"))!;
  return { ...d, movimientos: [...d.movimientos, { id: `x${fecha}${monto}`, fecha, monto, categoriaId: cat.id, detalle: "", pagoPor: d.miembros[0].id, creadoEn: "" }] };
};

describe("comparar con el banco", () => {
  it("si todo está cargado, el banco y la app cambian lo mismo", () => {
    const d0 = demo();
    const antes = { fecha: FECHA, banco: 5_000_000, app: acumuladoApp(d0, FECHA) };
    const d1 = gasto(d0, "2026-11-13", 30_000);
    const r = comparar(antes, 5_000_000 - 30_000, acumuladoApp(d1, "2026-11-13"));
    expect(r.diferencia).toBe(0);
    expect(r.coincide).toBe(true);
  });

  it("un gasto que no se cargó aparece como diferencia negativa", () => {
    const d0 = demo();
    const antes = { fecha: FECHA, banco: 5_000_000, app: acumuladoApp(d0, FECHA) };
    // En el banco salieron 80.000 pero en la app solo se cargaron 30.000.
    const d1 = gasto(d0, "2026-11-13", 30_000);
    const r = comparar(antes, 5_000_000 - 80_000, acumuladoApp(d1, "2026-11-13"));
    expect(r.diferencia).toBe(-50_000);
    expect(r.coincide).toBe(false);
  });

  it("lo apartado en Ahorro sigue en las cuentas: no es diferencia", () => {
    const d0 = { ...demo(), categorias: [...demo().categorias, { id: "ah", nombre: "Ahorro", orden: 99, techo: 0 }] };
    const antes = { fecha: FECHA, banco: 5_000_000, app: acumuladoApp(d0, FECHA) };
    const d1 = gasto(d0, "2026-11-13", 200_000, "Ahorro");
    expect(comparar(antes, 5_000_000, acumuladoApp(d1, "2026-11-13")).coincide).toBe(true);
  });

  it("el sueldo de un mes nuevo suma al acumulado", () => {
    const d = demo();
    const fin = acumuladoApp(d, "2026-11-30");
    const inicio = acumuladoApp(d, "2026-12-01");
    expect(inicio).toBeGreaterThan(fin);
  });
});
