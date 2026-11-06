import { describe, expect, it } from "vitest";
import { planMes, quedabaPorDia, resumenMes } from "./calculos";
import * as op from "./operaciones";
import type { Datos } from "./tipos";

const MES = "2026-03-01";

function base(): Datos {
  return {
    miembros: [{ id: "g", nombre: "Gastón" }],
    categorias: [
      { id: "super", nombre: "Súper y comida", orden: 0, techo: 100 },
      { id: "chicos", nombre: "Chicos", orden: 1, techo: 50 },
      { id: "deuda", nombre: "Deuda", orden: 2, techo: 0 },
    ],
    ingresos: [{ id: "i", miembroId: "g", concepto: "Sueldo", monto: 1000, mes: null }],
    movimientos: [
      { id: "a", fecha: "2026-03-02", monto: 40, categoriaId: "super", detalle: "", pagoPor: "g", creadoEn: "x" },
      { id: "b", fecha: "2026-03-05", monto: 10, categoriaId: "super", detalle: "", pagoPor: "g", creadoEn: "x" },
    ],
    pagosFijos: [
      { id: "cuota", concepto: "Cuota", categoriaId: "deuda", dia: 10, monto: 80, esDeuda: true, activo: true },
      { id: "luz", concepto: "Luz", categoriaId: "super", dia: 10, monto: 30, esDeuda: false, activo: true },
      { id: "alq", concepto: "Alquiler", categoriaId: "super", dia: 1, monto: 20, esDeuda: false, activo: true },
    ],
    pagosMes: [],
  };
}

describe("plan del mes", () => {
  it("ideal para ahorrar = entra − previsto; pueden gastar = lo que falta de los techos menos fijos pendientes", () => {
    const d = base();
    expect(resumenMes(d, MES).teQueda).toBe(820);
    // previsto: súper 100 + chicos 50 + deuda 80 = 230
    expect(planMes(d, MES)).toEqual({ ahorroIdeal: 770, puedenGastar: 50 });
  });

  it("pasarse de un techo sale del ahorro, no de lo que queda en las otras categorías", () => {
    const d = base();
    d.movimientos.push({ id: "c", fecha: "2026-03-06", monto: 200, categoriaId: "chicos", detalle: "", pagoPor: "g", creadoEn: "x" });
    // chicos se pasó 150: el ahorro baja de 770 a 620; en súper sigue sin quedar nada libre.
    expect(planMes(d, MES)).toEqual({ ahorroIdeal: 620, puedenGastar: 0 });
  });
});

describe("te quedaba por día", () => {
  it("el último día coincide con el te queda de hoy y los anteriores suman lo gastado después", () => {
    const q = quedabaPorDia(base(), MES);
    expect(q.get("2026-03-05")).toBe(820);
    expect(q.get("2026-03-02")).toBe(830);
  });

  it("pagar un fijo después no cambia lo que quedaba ese día", () => {
    const d = op.marcarPagado(base(), "luz", MES, "g", "pago-luz", "2026-03-06");
    const q = quedabaPorDia(d, MES);
    expect(q.get("2026-03-06")).toBe(820);
    expect(q.get("2026-03-05")).toBe(820);
  });
});
