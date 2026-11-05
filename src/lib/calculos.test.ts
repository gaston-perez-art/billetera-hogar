// Casos de las reglas de negocio. Al pasar a Supabase sirven para validar
// las vistas v_categorias_mes / v_reparto_mes con los mismos números.

import { describe, expect, it } from "vitest";
import { categoriasDelMes, gastoPrevisto, pagosDelMes, repartoMes, resumenMes, totalSantino } from "./calculos";
import { datosDemo } from "./demo";
import { fechaEnMes, pesos, sumarMeses } from "./formato";
import type { Datos } from "./tipos";

const MES = "2026-03-01";

function base(): Datos {
  return {
    miembros: [
      { id: "g", nombre: "Gastón" },
      { id: "j", nombre: "Jime" },
    ],
    categorias: [
      { id: "super", nombre: "Súper y comida", orden: 0, techo: 100 },
      { id: "chicos", nombre: "Chicos", orden: 1, techo: 50 },
      { id: "deuda", nombre: "Deuda", orden: 2, techo: 0 },
    ],
    ingresos: [
      { id: "i1", miembroId: "g", concepto: "Sueldo", monto: 600, mes: null },
      { id: "i2", miembroId: "j", concepto: "Sueldo", monto: 400, mes: null },
      { id: "i3", miembroId: "j", concepto: "Aguinaldo", monto: 200, mes: "2026-06-01" },
    ],
    movimientos: [],
    pagosFijos: [
      { id: "cuota", concepto: "Cuota", categoriaId: "deuda", dia: 10, monto: 80, esDeuda: true, activo: true },
      { id: "luz", concepto: "Luz", categoriaId: "super", dia: 10, monto: 30, esDeuda: false, activo: true },
      { id: "alq", concepto: "Alquiler", categoriaId: "super", dia: 1, monto: 20, esDeuda: false, activo: true },
      { id: "viejo", concepto: "Baja", categoriaId: "super", dia: 2, monto: 99, esDeuda: false, activo: false },
    ],
    pagosMes: [],
  };
}

const mov = (id: string, fecha: string, monto: number, categoriaId: string, pagoPor: string, detalle = "") => ({
  id, fecha, monto, categoriaId, pagoPor, detalle, creadoEn: `${fecha}T00:00:00Z`,
});

describe("resumen del mes", () => {
  it("te queda de verdad = entra − gastado − pagos que faltan", () => {
    const d = base();
    d.movimientos.push(mov("a", "2026-03-05", 70, "super", "g"));
    d.movimientos.push(mov("b", "2026-02-28", 999, "super", "g")); // otro mes, no cuenta
    d.pagosMes.push({ id: "p", pagoFijoId: "alq", mes: MES, monto: 20, pagado: true });
    const r = resumenMes(d, MES);
    expect(r).toEqual({ entra: 1000, gastado: 70, faltan: 110, teQueda: 820 });
  });

  it("los extras de un mes (aguinaldo) solo suman ese mes", () => {
    expect(resumenMes(base(), "2026-06-01").entra).toBe(1200);
    expect(resumenMes(base(), MES).entra).toBe(1000);
  });

  it("un monto negativo es plata que entra y descuenta del gastado", () => {
    const d = base();
    d.movimientos.push(mov("a", "2026-03-05", 100, "deuda", "g"), mov("b", "2026-03-04", -100, "deuda", "g"));
    expect(resumenMes(d, MES).gastado).toBe(0);
  });
});

describe("pagos fijos", () => {
  it("ordena por día y, dentro del día, por monto descendente; omite inactivos", () => {
    expect(pagosDelMes(base(), MES).map((p) => p.pagoFijo.id)).toEqual(["alq", "cuota", "luz"]);
  });

  it("muestra un inactivo si ya tiene registro en ese mes", () => {
    const d = base();
    d.pagosMes.push({ id: "p", pagoFijoId: "viejo", mes: MES, monto: 99, pagado: true });
    expect(pagosDelMes(d, MES).map((p) => p.pagoFijo.id)).toContain("viejo");
  });
});

describe("en qué se va", () => {
  it("techo de Deuda = techo base + cuotas fijas de deuda; te queda = techo − gastado", () => {
    const d = base();
    d.movimientos.push(mov("a", "2026-03-05", 130, "super", "g"));
    const cats = Object.fromEntries(categoriasDelMes(d, MES).map((c) => [c.categoria.id, c]));
    expect(cats.deuda.techo).toBe(80);
    expect(cats.super.queda).toBe(-30);
    expect(cats.chicos.queda).toBe(50);
  });

  it("gasto previsto = Σ max(techo, gastado)", () => {
    const d = base();
    d.movimientos.push(mov("a", "2026-03-05", 130, "super", "g"));
    expect(gastoPrevisto(d, MES)).toBe(130 + 50 + 80);
  });
});

describe("quién pone qué", () => {
  it("reparte el previsto según ingreso y compara plan vs. real", () => {
    const d = base();
    d.movimientos.push(mov("a", "2026-03-05", 200, "super", "j"));
    // previsto = max(100,200) + 50 + 80 = 330; Gastón 60%, Jime 40%
    const [g, j] = repartoMes(d, MES).miembros;
    expect(g.leToca).toBeCloseTo(198);
    expect(j.leToca).toBeCloseTo(132);
    expect(g.puso).toBe(0);
    expect(j.puso).toBe(200);
    expect(g.diferencia).toBeCloseTo(198); // puso de menos → verde, le debe a Jime
    expect(j.diferencia).toBeCloseTo(-68); // puso de más → rojo
    expect(g.leQuedaReal - g.leQuedaPlan).toBeCloseTo(g.diferencia);
  });

  it("sin ingresos no divide por cero", () => {
    const d = base();
    d.ingresos = [];
    expect(repartoMes(d, MES).miembros.every((m) => m.proporcion === 0 && m.leToca === 0)).toBe(true);
  });
});

describe("Santino", () => {
  it("suma Chicos con detalle que arranca con Santino", () => {
    const d = base();
    d.movimientos.push(
      mov("a", "2026-03-02", 10, "chicos", "g", "Santino útiles"),
      mov("b", "2026-03-03", 5, "chicos", "j", "santino peluquería"),
      mov("c", "2026-03-03", 7, "chicos", "j", "Regalo para Santino"),
      mov("d", "2026-03-03", 9, "super", "j", "Santino merienda"),
    );
    expect(totalSantino(d, MES)).toBe(15);
  });
});

describe("formato", () => {
  it("pesos es-AR sin decimales y ceros como guion", () => {
    expect(pesos(1234567.4)).toBe("$1.234.567");
    expect(pesos(-5000)).toBe("-$5.000");
    expect(pesos(0)).toBe("–");
    expect(pesos(0, { ceroComoGuion: false })).toBe("$0");
  });

  it("meses y fechas", () => {
    expect(sumarMeses("2026-01-01", -1)).toBe("2025-12-01");
    expect(sumarMeses("2026-12-01", 1)).toBe("2027-01-01");
    expect(fechaEnMes("2026-02-01", 31)).toBe("2026-02-28");
  });
});

describe("datos de demo", () => {
  it("son consistentes: cada pago marcado tiene su movimiento", () => {
    const d = datosDemo("2026-11-18");
    for (const p of d.pagosMes.filter((p) => p.pagado)) {
      expect(d.movimientos.some((m) => m.id === p.movimientoId)).toBe(true);
    }
  });
});
