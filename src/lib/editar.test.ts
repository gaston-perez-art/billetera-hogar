import { describe, expect, it } from "vitest";
import { pagosDelMes, resumenMes } from "./calculos";
import { editarMovimiento } from "./operaciones";
import type { Datos } from "./tipos";

const MES = "2026-11-01";
const base: Datos = {
  miembros: [{ id: "g", nombre: "Gastón" }],
  categorias: [{ id: "c1", nombre: "Super", orden: 1, techo: 100 }],
  ingresos: [{ id: "i1", miembroId: "g", concepto: "Sueldo", monto: 1000, mes: null }],
  movimientos: [
    { id: "m1", fecha: "2026-11-02", monto: 50, categoriaId: "c1", detalle: "Súper", pagoPor: "g", creadoEn: "" },
    { id: "m2", fecha: "2026-11-03", monto: -200, categoriaId: "c1", detalle: "Préstamo", pagoPor: "g", creadoEn: "" },
    { id: "m3", fecha: "2026-11-01", monto: 30, categoriaId: "c1", detalle: "Luz", pagoPor: "g", creadoEn: "" },
  ],
  pagosFijos: [{ id: "luz", concepto: "Luz", categoriaId: "c1", dia: 5, monto: 30, esDeuda: false, activo: true }],
  pagosMes: [{ id: "pm", pagoFijoId: "luz", mes: MES, monto: 30, pagado: true, movimientoId: "m3" }],
};

describe("editar un movimiento", () => {
  it("cambia monto y detalle, y el gastado del mes lo refleja", () => {
    const d = editarMovimiento(base, "m1", { monto: 80, detalle: "  Súper grande " });
    expect(d.movimientos[0]).toMatchObject({ monto: 80, detalle: "Súper grande" });
    expect(resumenMes(d, MES).gastado).toBe(resumenMes(base, MES).gastado + 30);
  });

  it("lo que entraba sigue entrando", () => {
    const d = editarMovimiento(base, "m2", { monto: 300 });
    expect(d.movimientos[1].monto).toBe(-300);
  });

  it("si venía de un pago fijo, el pago guarda el monto nuevo y sigue pagado", () => {
    const d = editarMovimiento(base, "m3", { monto: 35 });
    const luz = pagosDelMes(d, MES)[0];
    expect(luz).toMatchObject({ monto: 35, pagado: true });
    expect(d.movimientos[2].monto).toBe(35);
  });

  it("sin cambios de monto, solo el detalle", () => {
    const d = editarMovimiento(base, "m1", { detalle: "Otro" });
    expect(d.movimientos[0]).toMatchObject({ monto: 50, detalle: "Otro" });
  });
});
