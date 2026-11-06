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
  it("para gastar = entra − gastado − pagos que faltan − para ahorrar", () => {
    const d = base();
    expect(resumenMes(d, MES).teQueda).toBe(820);
    // previsto: súper 100 + chicos 50 + deuda 80 = 230 → ahorro ideal 770
    const p = planMes(d, MES);
    expect(p).toMatchObject({ entra: 1000, gastado: 50, faltan: 130, ahorroIdeal: 770, paraAhorrar: 770, paraGastar: 50 });
    expect(p.entra - p.gastado - p.faltan - p.paraAhorrar).toBe(p.paraGastar);
  });

  it("si el presupuesto supera lo que entra, no se aparta ahorro y la cuenta sigue cerrando", () => {
    const d = base();
    d.ingresos[0].monto = 200;
    const p = planMes(d, MES);
    expect(p.ahorroIdeal).toBe(-30);
    expect(p.paraAhorrar).toBe(0);
    expect(p.paraGastar).toBe(200 - 50 - 130);
  });

  it("pasarse de un techo sale del ahorro, no de lo que queda en las otras categorías", () => {
    const d = base();
    d.movimientos.push({ id: "c", fecha: "2026-03-06", monto: 200, categoriaId: "chicos", detalle: "", pagoPor: "g", creadoEn: "x" });
    // chicos se pasó 150: el ahorro baja de 770 a 620; en súper sigue sin quedar nada libre.
    expect(planMes(d, MES)).toMatchObject({ ahorroIdeal: 620, paraGastar: 0 });
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
