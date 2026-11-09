// Todas las pantallas cuentan lo mismo: si un número aparece en dos lugares, es el mismo.
// Y editar algo desde un mes no cambia los meses anteriores.

import { describe, expect, it } from "vitest";
import {
  ahorro,
  categoriasDelMes,
  esCompraEnCuotas,
  cuotaDelMes,
  cuotasEnDolares,
  deudas,
  dolaresPorMes,
  gastosDe,
  saldoDolares,
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

  it("Inicio: lo libre de Gastón más lo de Jime es el libre de la pareja", () => {
    const d = demo();
    cerca(suma(paraGastarPorPersona(d, MES).map((x) => x.libre)), planMes(d, MES).paraCadaUno);
  });

  it("Inicio: tu dinero hoy = pagos que faltan + reservado + libre", () => {
    const p = planMes(demo(), MES);
    cerca(p.faltan + p.paraGastar + p.paraCadaUno, p.saldo);
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

  it("adelantar una baja (de enero a diciembre) no toca los meses pagados ni sus gastos", () => {
    const d = demo();
    const pf = d.pagosFijos.find((p) => p.concepto === "Luz")!;
    const anterior = sumarMeses(MES, -1);
    const dic = sumarMeses(MES, 1);
    // Pagado el mes pasado y este; baja programada para enero; después se adelanta a diciembre.
    let x = op.marcarPagado(d, pf.id, anterior, "gaston", "mov-ant", "2026-10-05");
    x = op.marcarPagado(x, pf.id, MES, "jime", "mov-act", FECHA);
    x = op.actualizarPagoFijo(x, pf.id, { activo: false, bajaDesde: sumarMeses(MES, 2) });
    expect(pagosDelMes(x, dic).some((p) => p.pagoFijo.id === pf.id)).toBe(true);
    const adelantada = op.actualizarPagoFijo(x, pf.id, { activo: false, bajaDesde: dic });
    expect(pagosDelMes(adelantada, dic).some((p) => p.pagoFijo.id === pf.id)).toBe(false);
    for (const m of [anterior, MES]) {
      expect(pagosDelMes(adelantada, m).find((p) => p.pagoFijo.id === pf.id)).toMatchObject({ pagado: true });
      expect(planMes(adelantada, m)).toEqual(planMes(x, m));
    }
    expect(adelantada.movimientos).toEqual(x.movimientos);
    expect(adelantada.pagosMes).toEqual(x.pagosMes);
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
    const cuotasEnPagos = suma(pagosDelMes(con, MES).filter((p) => esCompraEnCuotas(p.pagoFijo)).map((p) => p.monto));
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


describe("ahorro y préstamos", () => {
  const conAhorro = (d: Datos, monto: number, quien = "gaston", id = "ap") => {
    const conCat = d.categorias.some((c) => c.nombre === "Ahorro") ? d : op.agregarCategoria(d, "cat-ahorro", "Ahorro");
    const cat = conCat.categorias.find((c) => c.nombre === "Ahorro")!;
    return op.agregarMovimiento(conCat, { id, fecha: FECHA, monto, categoriaId: cat.id, detalle: "", pagoPor: quien, creadoEn: id });
  };

  it("apartar baja lo que tienen y lo de quien apartó; las cuentas siguen cerrando", () => {
    const antes = demo();
    const d = conAhorro(antes, 50_000);
    expect(ahorro(d, MES)).toMatchObject({ saldo: 50_000, delMes: 50_000 });
    cerca(planMes(antes, MES).saldo - planMes(d, MES).saldo, 50_000);
    const gaston = (x: Datos) => paraGastarPorPersona(x, MES).find((p) => p.miembroId === "gaston")!.saldo;
    cerca(gaston(antes) - gaston(d), 50_000);
    // No toca lo de la casa: sale de lo que le queda a cada uno.
    cerca(planMes(d, MES).paraGastar, planMes(antes, MES).paraGastar);
    cerca(suma(categoriasDelMes(d, MES).map((c) => c.libre)), planMes(d, MES).paraGastar);
    cerca(suma(paraGastarPorPersona(d, MES).map((x) => x.paraGastar)), planMes(d, MES).paraGastar);
  });

  it("retirar baja lo apartado y la plata vuelve", () => {
    const d = conAhorro(conAhorro(demo(), 50_000, "gaston", "ap1"), -20_000, "jime", "ap2");
    const a = ahorro(d, MES);
    expect(a.saldo).toBe(30_000);
    expect(a.porPersona).toEqual([
      { miembroId: "gaston", monto: 50_000 },
      { miembroId: "jime", monto: -20_000 },
    ]);
    cerca(suma(categoriasDelMes(d, MES).map((c) => c.libre)), planMes(d, MES).paraGastar);
  });

  it("un préstamo va en Fijos con su cuota, no en Tarjetas, y se paga con el monto que manda el banco", () => {
    const d = demo();
    const deuda = d.categorias.find((c) => c.nombre === "Deuda")!;
    const pf = op.armarPagoFijo(
      { concepto: "Personal", categoriaId: deuda.id, dia: 11, monto: 300_000, esDeuda: true, cuotas: 36, primeraCuota: sumarMeses(MES, -4), prestamo: true, uva: true, tarjetaId: "tj-galicia" },
      MES,
      "prestamo",
    );
    expect(pf).toMatchObject({ prestamo: true, uva: true, tarjetaId: null });
    const con = op.agregarPagoFijo(d, pf);
    expect(cuotaDelMes(pf, MES)).toEqual({ numero: 5, total: 36 });
    expect(resumenTarjeta(con, null, MES).delMes).toBe(resumenTarjeta(d, null, MES).delMes);
    cerca(planMes(con, MES).faltan - planMes(d, MES).faltan, 300_000);

    const pagado = op.marcarPagado(con, "prestamo", MES, "gaston", "mov-p", FECHA, 310_578.56);
    expect(pagado.movimientos.find((m) => m.id === "mov-p")).toMatchObject({ monto: 310_578.56, detalle: "Personal, cuota 5 de 36" });
    expect(pagosDelMes(pagado, MES).find((p) => p.pagoFijo.id === "prestamo")).toMatchObject({ pagado: true, monto: 310_578.56 });
    cerca(suma(categoriasDelMes(pagado, MES).map((c) => c.libre)), planMes(pagado, MES).paraGastar);
  });

  it("convertir un pago fijo en préstamo mantiene los meses ya pagados", () => {
    const d = demo();
    const anterior = sumarMeses(MES, -1);
    const pagadoAntes = op.marcarPagado(d, "pf-prestamo", anterior, "gaston", "mov-ant", "2026-10-05");
    const convertido = op.actualizarPagoFijo(pagadoAntes, "pf-prestamo", { cuotas: 36, altaDesde: MES, prestamo: true, uva: true });
    expect(pagosDelMes(convertido, anterior).find((p) => p.pagoFijo.id === "pf-prestamo")).toMatchObject({ pagado: true, monto: 180_000 });
    expect(cuotaDelMes(convertido.pagosFijos.find((p) => p.id === "pf-prestamo")!, MES)).toEqual({ numero: 1, total: 36 });
  });
});

describe("préstamo en dólares", () => {
  // US$ 6.000, mínimo US$ 400 por mes, primera cuota el mes que viene, dólar a $1.400.
  const conDolares = () => {
    const d = demo();
    const deuda = d.categorias.find((c) => c.nombre === "Deuda")!;
    const pf = op.armarPagoFijo(
      { concepto: "Papá", categoriaId: deuda.id, dia: 10, monto: 400 * 1400, esDeuda: true, cuotas: 15, primeraCuota: sumarMeses(MES, 1), prestamo: true, usdTotal: 6000, usdCuota: 400 },
      MES,
      "usd",
    );
    return op.agregarPagoFijo(d, pf);
  };
  const DIC = sumarMeses(MES, 1);
  const prestamo = (d: Datos) => d.pagosFijos.find((p) => p.id === "usd")!;

  it("pagando el mínimo son 15 cuotas desde el mes que viene, estimadas al dólar cargado", () => {
    const d = conDolares();
    const pf = prestamo(d);
    expect(pf).toMatchObject({ usdTotal: 6000, usdCuota: 400, uva: false, altaDesde: DIC });
    expect(cuotasEnDolares(d, pf)).toBe(15);
    expect(pagosDelMes(d, MES).some((p) => p.pagoFijo.id === "usd")).toBe(false);
    expect(pagosDelMes(d, DIC).find((p) => p.pagoFijo.id === "usd")).toMatchObject({ monto: 560_000, pagado: false });
    expect(restaDeCompra(d, pf, MES)).toEqual({ monto: 6000 * 1400, cuotas: 15 });
  });

  it("pagar más que el mínimo se descuenta de lo que deben y termina antes; el mes siguiente vuelve al mínimo", () => {
    const pagado = op.marcarPagado(conDolares(), "usd", DIC, "gaston", "mov-usd", "2026-12-10", 1_000 * 1450, 1_000);
    const pf = prestamo(pagado);
    expect(pagado.movimientos.find((m) => m.id === "mov-usd")).toMatchObject({ monto: 1_450_000, detalle: "Papá, cuota 1 de 15" });
    expect(pagado.pagosMes.find((p) => p.pagoFijoId === "usd" && p.mes === DIC)).toMatchObject({ usd: 1_000, monto: 1_450_000, pagado: true });
    expect(saldoDolares(pagado, pf)).toBe(5_000);
    // 1 pagada + 12 de 400 + una de 200.
    expect(pf.cuotas).toBe(14);
    const porMes = dolaresPorMes(pagado, pf);
    expect(porMes.get(sumarMeses(DIC, 1))).toBe(400);
    expect(porMes.get(sumarMeses(DIC, 13))).toBe(200);
    expect(suma([...porMes.values()])).toBe(5_000);
    expect(pagosDelMes(pagado, sumarMeses(DIC, 14)).some((p) => p.pagoFijo.id === "usd")).toBe(false);
  });

  it("desmarcar el pago devuelve la deuda y las cuotas", () => {
    const pagado = op.marcarPagado(conDolares(), "usd", DIC, "gaston", "mov-usd", "2026-12-10", 1_450_000, 1_000);
    const vuelta = op.desmarcarPagado(pagado, "usd", DIC);
    expect(saldoDolares(vuelta, prestamo(vuelta))).toBe(6_000);
    expect(prestamo(vuelta).cuotas).toBe(15);
  });

  it("pagado sin decir cuántos dólares (desde Fijos), cuenta lo que le toca al mes", () => {
    const pagado = op.marcarPagado(conDolares(), "usd", DIC, "jime", "mov-usd", "2026-12-10");
    expect(pagado.pagosMes.find((p) => p.pagoFijoId === "usd" && p.mes === DIC)).toMatchObject({ usd: 400, monto: 560_000 });
    expect(saldoDolares(pagado, prestamo(pagado))).toBe(5_600);
  });

  it("las cuentas siguen cerrando con un préstamo en dólares pagado", () => {
    // En este mes, para que los datos de demo no pasen lo que entra.
    const d0 = conDolares();
    const d1 = op.actualizarPagoFijo(d0, "usd", { altaDesde: MES, monto: 400 * 500 });
    const d = op.marcarPagado(d1, "usd", MES, "gaston", "mov-usd", FECHA, 500 * 510, 500);
    const p = planMes(d, MES);
    expect(p.paraCadaUno).toBeGreaterThan(0);
    cerca(p.entra - p.gastado - p.faltan - p.paraCadaUno, p.paraGastar);
    cerca(suma(categoriasDelMes(d, MES).map((c) => c.libre)), p.paraGastar);
    cerca(suma(categoriasDelMes(d, MES).map((c) => c.pendiente)), suma(pagosDelMes(d, MES).filter((x) => !x.pagado).map((x) => x.monto)));
  });
});

describe("lo que deben entre tarjetas y préstamos", () => {
  const conTodo = () => {
    const d = demo();
    const deuda = d.categorias.find((c) => c.nombre === "Deuda")!;
    const pf = op.armarPagoFijo(
      { concepto: "Papá", categoriaId: deuda.id, dia: 10, monto: 560_000, esDeuda: true, cuotas: 15, primeraCuota: MES, prestamo: true, usdTotal: 6000, usdCuota: 400 },
      MES,
      "usd",
    );
    return op.agregarPagoFijo(d, pf);
  };

  it("lo del mes es lo que suman Tarjetas y Préstamos", () => {
    const d = conTodo();
    const r = deudas(d, MES);
    const tarjetas = [...(d.tarjetas ?? []).map((t) => t.id), null];
    cerca(r.delMes.tarjetas, suma(tarjetas.map((t) => resumenTarjeta(d, t, MES).delMes)));
    cerca(r.delMes.prestamos, suma(pagosDelMes(d, MES).filter((p) => p.pagoFijo.prestamo).map((p) => p.monto)));
    expect(r.porMes[0]).toMatchObject({ mes: MES, tarjetas: r.delMes.tarjetas, prestamos: r.delMes.prestamos });
  });

  it("lo que resta es lo que dicen las tarjetas y los préstamos, y en dólares cierra con lo que deben", () => {
    const d = conTodo();
    const r = deudas(d, MES);
    const tarjetas = [...(d.tarjetas ?? []).map((t) => t.id), null];
    cerca(r.resta.tarjetas, suma(tarjetas.map((t) => resumenTarjeta(d, t, MES).resta)));
    cerca(r.resta.prestamos, suma(d.pagosFijos.filter((p) => p.prestamo).map((p) => restaDeCompra(d, p, MES).monto)));
    expect(r.usd).toBe(6_000);
    cerca(restaDeCompra(d, d.pagosFijos.find((p) => p.id === "usd")!, MES).monto, 6_000 * 1_400);
  });

  it("mes por mes: sin pagar nada, lo que falta de los meses suma lo que resta", () => {
    const d = conTodo();
    const r = deudas(d, MES, 60);
    cerca(suma(r.porMes.map((m) => m.tarjetas + m.prestamos)) - suma(pagosDelMes(d, MES).filter((p) => p.pagado && (p.pagoFijo.prestamo || esCompraEnCuotas(p.pagoFijo))).map((p) => p.monto)), r.resta.tarjetas + r.resta.prestamos);
  });
});
