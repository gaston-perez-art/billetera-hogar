// Todas las pantallas cuentan lo mismo: si un número aparece en dos lugares, es el mismo.
// Y editar algo desde un mes no cambia los meses anteriores.

import { describe, expect, it } from "vitest";
import {
  categoriasDelMes,
  gastosDe,
  pagosDelMes,
  paraGastarPorPersona,
  planMes,
  saldoPorDia,
  repartoMes,
  resumenMes,
} from "./calculos";
import { datosDemo } from "./demo";
import { mesDe, sumarMeses } from "./formato";
import * as op from "./operaciones";
import type { Datos } from "./tipos";

const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const cerca = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(0.01);

const FECHA = "2026-11-12";
const MES = mesDe(FECHA);
const demo = () => datosDemo(FECHA);

describe("los números coinciden entre pantallas", () => {
  it("Inicio: la resta de la tarjeta cierra", () => {
    const p = planMes(demo(), MES);
    cerca(p.entra - p.gastado - p.faltan - p.paraCadaUno, p.paraGastar);
  });

  it("Inicio: lo de Gastón más lo de Jime es el número grande", () => {
    const d = demo();
    cerca(suma(paraGastarPorPersona(d, MES).map((x) => x.paraGastar)), planMes(d, MES).paraGastar);
  });

  it("Solo yo: lo de cada uno, sumado, es lo gastado de Inicio", () => {
    const d = demo();
    const porPersona = d.miembros.map((m) => gastosDe(d, MES, m.id));
    cerca(suma(porPersona.map((g) => g.gastado - g.entro)), planMes(d, MES).gastado);
    for (const g of porPersona) cerca(suma(g.categorias.map((c) => c.monto)), g.gastado);
  });

  it("Categorías: lo libre de todas las categorías es el número de Inicio", () => {
    const d = demo();
    cerca(suma(categoriasDelMes(d, MES).map((c) => c.libre)), planMes(d, MES).paraGastar);
  });

  it("Categorías: lo comprometido en pagos fijos es lo que falta pagar en Pagos", () => {
    const d = demo();
    cerca(suma(categoriasDelMes(d, MES).map((c) => c.pendiente)), suma(pagosDelMes(d, MES).filter((p) => !p.pagado).map((p) => p.monto)));
  });

  it("Pagos: lo que falta pagar es lo mismo que en Inicio", () => {
    const d = demo();
    cerca(suma(pagosDelMes(d, MES).filter((p) => !p.pagado).map((p) => p.monto)), planMes(d, MES).faltan);
  });

  it("Reparto: lo que puso cada uno suma lo gastado, y el ahorro ideal de los dos es el de Inicio", () => {
    const d = demo();
    const r = repartoMes(d, MES);
    cerca(suma(r.miembros.map((m) => m.puso)), resumenMes(d, MES).gastado);
    cerca(suma(r.miembros.map((m) => m.leQuedaPlan)), planMes(d, MES).sobrante);
  });

  it("Inicio: el saldo de los dos es lo que entró menos lo gastado, y lo de cada uno suma eso", () => {
    const d = demo();
    const p = planMes(d, MES);
    cerca(p.saldo, p.entra - p.gastado);
    cerca(suma(paraGastarPorPersona(d, MES).map((x) => x.saldo)), p.saldo);
  });

  it("Inicio: el saldo del último día con gastos es el de la tarjeta", () => {
    const d = demo();
    const q = saldoPorDia(d, MES);
    const ultimo = [...q.keys()].sort().at(-1)!;
    cerca(q.get(ultimo)!, planMes(d, MES).saldo);
  });

  it("Inicio: del saldo, restando pagos que faltan y ahorro, queda lo de 'para gastar'", () => {
    const p = planMes(demo(), MES);
    cerca(p.saldo - p.faltan - p.paraCadaUno, p.paraGastar);
  });

  it("cargar un gasto baja lo mismo en Inicio, en la categoría y en quien lo pagó", () => {
    const antes = demo();
    const cat = antes.categorias.find((c) => c.nombre === "Súper y comida")!;
    const despues = op.agregarMovimiento(antes, { id: "nuevo", fecha: FECHA, monto: 10_000, categoriaId: cat.id, detalle: "", pagoPor: "jime", creadoEn: "x" });
    const libre = (d: Datos) => categoriasDelMes(d, MES).find((c) => c.categoria.id === cat.id)!.libre;
    const jime = (d: Datos) => paraGastarPorPersona(d, MES).find((x) => x.miembroId === "jime")!.paraGastar;
    cerca(planMes(antes, MES).paraGastar - planMes(despues, MES).paraGastar, 10_000);
    cerca(libre(antes) - libre(despues), 10_000);
    expect(jime(antes) - jime(despues)).toBeGreaterThan(0);
  });

  it("pagar un pago fijo no cambia lo que queda para gastar (ya estaba comprometido)", () => {
    const d = demo();
    const pendiente = pagosDelMes(d, MES).find((p) => !p.pagado)!;
    const pagado = op.marcarPagado(d, pendiente.pagoFijo.id, MES, "gaston", "mov-pago", FECHA);
    cerca(planMes(pagado, MES).paraGastar, planMes(d, MES).paraGastar);
    cerca(suma(categoriasDelMes(pagado, MES).map((c) => c.libre)), planMes(pagado, MES).paraGastar);
  });
});

describe("editar desde un mes no cambia los meses anteriores", () => {
  const anterior = sumarMeses(MES, -1);

  it("cambiar un sueldo vale desde el mes elegido", () => {
    const d = demo();
    const sueldo = d.ingresos.find((i) => i.miembroId === "gaston")!;
    const antes = planMes(d, anterior).entra;
    const cambio = op.planCambioIngreso(d, sueldo.id, sueldo.monto + 500_000, MES, "nuevo-sueldo");
    const nuevo = op.aplicarCambioIngreso(d, cambio);
    expect(planMes(nuevo, anterior).entra).toBe(antes);
    expect(planMes(nuevo, MES).entra).toBe(planMes(d, MES).entra + 500_000);
    expect(planMes(nuevo, sumarMeses(MES, 3)).entra).toBe(planMes(d, MES).entra + 500_000);
  });

  it("cambiarlo dos veces en el mismo mes no crea versiones de más", () => {
    const d = demo();
    const sueldo = d.ingresos.find((i) => i.miembroId === "gaston")!;
    const una = op.aplicarCambioIngreso(d, op.planCambioIngreso(d, sueldo.id, 1, MES, "v2"));
    const dos = op.aplicarCambioIngreso(una, op.planCambioIngreso(una, "v2", 2, MES, "v3"));
    expect(dos.ingresos.length).toBe(d.ingresos.length + 1);
    expect(planMes(dos, MES).entra).toBe(planMes(d, MES).entra - sueldo.monto + 2);
  });

  it("dar de baja un pago fijo desde un mes lo deja en los meses anteriores", () => {
    const d = demo();
    const pf = d.pagosFijos.find((p) => p.concepto === "Luz")!;
    const baja = op.actualizarPagoFijo(d, pf.id, { activo: false, bajaDesde: MES });
    const tiene = (x: Datos, m: string) => pagosDelMes(x, m).some((p) => p.pagoFijo.id === pf.id);
    expect(tiene(baja, sumarMeses(MES, -2))).toBe(true);
    expect(tiene(baja, MES)).toBe(false);
    expect(tiene(baja, sumarMeses(MES, 1))).toBe(false);
  });
});
