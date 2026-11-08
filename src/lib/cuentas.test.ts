// Todas las pantallas cuentan lo mismo: si un número aparece en dos lugares, es el mismo.
// Y editar algo desde un mes no cambia los meses anteriores.

import { describe, expect, it } from "vitest";
import {
  categoriasDelMes,
  cuotaDelMes,
  gastosDe,
  restaDeCompra,
  resumenTarjeta,
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

  it("agregar un pago fijo vale desde el mes elegido y suma a lo que falta pagar", () => {
    const d = demo();
    const pf = op.armarPagoFijo({ concepto: " Internet ", categoriaId: d.categorias[0].id, dia: 28, monto: 1000, esDeuda: false }, MES, "inet");
    const con = op.agregarPagoFijo(d, pf);
    const tiene = (x: Datos, m: string) => pagosDelMes(x, m).some((p) => p.pagoFijo.id === "inet");
    expect(pf.concepto).toBe("Internet");
    expect(tiene(con, sumarMeses(MES, -1))).toBe(false);
    expect(tiene(con, MES)).toBe(true);
    expect(planMes(con, sumarMeses(MES, -1))).toEqual(planMes(d, sumarMeses(MES, -1)));
    expect(planMes(con, MES).faltan).toBe(planMes(d, MES).faltan + 1000);
  });

  it("una compra en cuotas arranca el mes siguiente, dice qué cuota es y se va sola después de la última", () => {
    const d = demo();
    const deuda = d.categorias.find((c) => c.nombre === "Deuda")!;
    const pf = op.armarPagoFijo({ concepto: "Heladera", categoriaId: deuda.id, dia: 10, monto: 100, esDeuda: true, cuotas: 3 }, MES, "hel");
    const con = op.agregarPagoFijo(d, pf);
    const tiene = (m: string) => pagosDelMes(con, m).some((p) => p.pagoFijo.id === "hel");
    expect(pf.altaDesde).toBe(sumarMeses(MES, 1));
    expect(tiene(MES)).toBe(false);
    expect(planMes(con, MES)).toEqual(planMes(d, MES));
    expect(tiene(sumarMeses(MES, 1))).toBe(true);
    expect(cuotaDelMes(pf, sumarMeses(MES, 1))).toEqual({ numero: 1, total: 3 });
    expect(cuotaDelMes(pf, sumarMeses(MES, 3))).toEqual({ numero: 3, total: 3 });
    expect(tiene(sumarMeses(MES, 3))).toBe(true);
    expect(tiene(sumarMeses(MES, 4))).toBe(false);
  });

  it("una compra en cuotas suma al techo de Deuda y a lo que falta pagar, y las cuentas siguen cerrando", () => {
    const d = demo();
    const deuda = d.categorias.find((c) => c.nombre === "Deuda")!;
    const con = op.agregarPagoFijo(
      d,
      op.armarPagoFijo({ concepto: "Tele", categoriaId: deuda.id, dia: 28, monto: 500, esDeuda: true, cuotas: 6, primeraCuota: MES }, MES, "tele"),
    );
    const techo = (x: Datos) => categoriasDelMes(x, MES).find((c) => c.categoria.id === deuda.id)!.techo;
    expect(techo(con)).toBe(techo(d) + 500);
    expect(planMes(con, MES).faltan).toBe(planMes(d, MES).faltan + 500);
    cerca(suma(categoriasDelMes(con, MES).map((c) => c.libre)), planMes(con, MES).paraGastar);
    cerca(suma(paraGastarPorPersona(con, MES).map((x) => x.paraGastar)), planMes(con, MES).paraGastar);
    cerca(suma(categoriasDelMes(con, MES).map((c) => c.pendiente)), planMes(con, MES).faltan);
  });

  it("pagar una cuota crea el gasto con qué cuota es, y pagada sigue apareciendo aunque la compra se dé de baja", () => {
    const d = demo();
    const deuda = d.categorias.find((c) => c.nombre === "Deuda")!;
    const con = op.agregarPagoFijo(
      d,
      op.armarPagoFijo({ concepto: "Tele", categoriaId: deuda.id, dia: 28, monto: 500, esDeuda: true, cuotas: 6, primeraCuota: sumarMeses(MES, -1) }, MES, "tele"),
    );
    const pagada = op.marcarPagado(con, "tele", MES, "gaston", "mov-tele", FECHA);
    expect(pagada.movimientos.find((m) => m.id === "mov-tele")!.detalle).toBe("Tele, cuota 2 de 6");
    const baja = op.actualizarPagoFijo(pagada, "tele", { activo: false, bajaDesde: MES });
    expect(pagosDelMes(baja, MES).some((p) => p.pagoFijo.id === "tele" && p.pagado)).toBe(true);
    expect(pagosDelMes(baja, sumarMeses(MES, 1)).some((p) => p.pagoFijo.id === "tele")).toBe(false);
  });

  it("corregir una compra en cuotas: adelantar la primera cuota la trae a este mes, y las pagadas no se pierden", () => {
    const d = demo();
    const deuda = d.categorias.find((c) => c.nombre === "Deuda")!;
    const con = op.agregarPagoFijo(
      d,
      op.armarPagoFijo({ concepto: "Silla", categoriaId: deuda.id, dia: 28, monto: 300, esDeuda: true, cuotas: 3 }, MES, "silla"),
    );
    const tiene = (x: Datos, m: string) => pagosDelMes(x, m).some((p) => p.pagoFijo.id === "silla");
    expect(tiene(con, MES)).toBe(false);
    const corregida = op.actualizarPagoFijo(con, "silla", { altaDesde: MES, cuotas: 4 });
    expect(tiene(corregida, MES)).toBe(true);
    expect(cuotaDelMes(corregida.pagosFijos.find((p) => p.id === "silla")!, MES)).toEqual({ numero: 1, total: 4 });
    expect(planMes(corregida, MES).faltan).toBe(planMes(d, MES).faltan + 300);
    // Pagada la de este mes, si después se corre la primera cuota para adelante, la pagada sigue en su mes.
    const pagada = op.marcarPagado(corregida, "silla", MES, "gaston", "mov-silla", FECHA);
    const corrida = op.actualizarPagoFijo(pagada, "silla", { altaDesde: sumarMeses(MES, 1) });
    expect(pagosDelMes(corrida, MES).some((p) => p.pagoFijo.id === "silla" && p.pagado)).toBe(true);
  });

  it("borrar una tarjeta deja sus compras sin tarjeta y las cuentas no cambian", () => {
    const d = demo();
    const t = op.armarTarjeta({ banco: " Galicia ", ultimos4: "4321", miembroId: "jime" }, "tj");
    const deuda = d.categorias.find((c) => c.nombre === "Deuda")!;
    const con = op.agregarPagoFijo(
      op.agregarTarjeta(d, t),
      op.armarPagoFijo({ concepto: "Tele", categoriaId: deuda.id, dia: 28, monto: 500, esDeuda: true, cuotas: 6, primeraCuota: MES, tarjetaId: "tj" }, MES, "tele"),
    );
    expect(t.banco).toBe("Galicia");
    expect(con.pagosFijos.find((p) => p.id === "tele")!.tarjetaId).toBe("tj");
    const sin = op.borrarTarjeta(con, "tj");
    expect(sin.tarjetas!.some((x) => x.id === "tj")).toBe(false);
    expect(sin.pagosFijos.find((p) => p.id === "tele")!.tarjetaId).toBeNull();
    expect(planMes(sin, MES)).toEqual(planMes(con, MES));
  });

  it("un pago fijo común no guarda tarjeta aunque venga una", () => {
    const d = demo();
    const pf = op.armarPagoFijo({ concepto: "Gas", categoriaId: d.categorias[0].id, dia: 5, monto: 10, esDeuda: false, tarjetaId: "tj" }, MES, "gas");
    expect(pf.tarjetaId).toBeNull();
    expect(pf.cuotas).toBeNull();
  });

  it("Tarjetas: lo del mes de cada tarjeta (y sin tarjeta) suma las cuotas que hay en Pagos", () => {
    const d = demo();
    const deuda = d.categorias.find((c) => c.nombre === "Deuda")!;
    const con = op.agregarPagoFijo(
      d,
      op.armarPagoFijo({ concepto: "Silla", categoriaId: deuda.id, dia: 28, monto: 300, esDeuda: true, cuotas: 3, primeraCuota: MES }, MES, "silla"),
    );
    const cuotasEnPagos = suma(pagosDelMes(con, MES).filter((p) => p.pagoFijo.cuotas).map((p) => p.monto));
    const porTarjeta = [...con.tarjetas!.map((t) => t.id), null].map((id) => resumenTarjeta(con, id, MES).delMes);
    cerca(suma(porTarjeta), cuotasEnPagos);
  });

  it("Tarjetas: las barras por mes suman lo que resta y bajan a cero después de la última cuota", () => {
    const d = demo();
    const deuda = d.categorias.find((c) => c.nombre === "Deuda")!;
    const t = op.armarTarjeta({ banco: "Banco", ultimos4: "1111", miembroId: "gaston" }, "tj-b");
    const con = op.agregarPagoFijo(
      op.agregarTarjeta(d, t),
      op.armarPagoFijo({ concepto: "Tele", categoriaId: deuda.id, dia: 28, monto: 100, esDeuda: true, cuotas: 3, primeraCuota: MES, tarjetaId: "tj-b" }, MES, "tele"),
    );
    const barras = [0, 1, 2, 3, 4, 5].map((i) => resumenTarjeta(con, "tj-b", sumarMeses(MES, i)).delMes);
    expect(barras).toEqual([100, 100, 100, 0, 0, 0]);
    expect(suma(barras)).toBe(resumenTarjeta(con, "tj-b", MES).resta);
  });

  it("Tarjetas: lo que resta cuenta desde este mes, sin las cuotas ya pagadas", () => {
    const d = demo();
    const deuda = d.categorias.find((c) => c.nombre === "Deuda")!;
    const pf = op.armarPagoFijo({ concepto: "Tele", categoriaId: deuda.id, dia: 28, monto: 100, esDeuda: true, cuotas: 6, primeraCuota: sumarMeses(MES, -2) }, MES, "tele");
    const con = op.agregarPagoFijo(d, pf);
    // Cuotas 3 a 6 desde este mes: 4 × 100.
    expect(restaDeCompra(con, pf, MES)).toEqual({ monto: 400, cuotas: 4 });
    const pagada = op.marcarPagado(con, "tele", MES, "gaston", "mov-tele", FECHA);
    expect(restaDeCompra(pagada, pf, MES)).toEqual({ monto: 300, cuotas: 3 });
    expect(restaDeCompra(pagada, pf, sumarMeses(MES, 4))).toEqual({ monto: 0, cuotas: 0 });
    // Dada de baja desde el mes que viene: resta solo la de este mes.
    const baja = op.actualizarPagoFijo(con, "tele", { activo: false, bajaDesde: sumarMeses(MES, 1) });
    expect(restaDeCompra(baja, baja.pagosFijos.find((p) => p.id === "tele")!, MES)).toEqual({ monto: 100, cuotas: 1 });
  });
});

