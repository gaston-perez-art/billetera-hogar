// Datos de demo. TODOS los montos son ficticios (el repo es público: nunca datos reales).

import { fechaEnMes, hoy, mesDe, sumarMeses } from "./formato";
import type { Categoria, Datos, Ingreso, Mes, Movimiento, PagoFijo, PagoMes } from "./tipos";

export const CATEGORIAS: [string, number][] = [
  ["Súper y comida", 600000],
  ["Delivery", 80000],
  ["Nafta y transporte", 150000],
  ["Uber", 40000],
  ["Casa y servicios", 700000],
  ["Izán", 150000],
  ["Santino", 80000],
  ["Entrenamientos", 50000],
  ["Salud", 90000],
  ["Personal", 120000],
  ["Deuda", 0],
  ["Salidas con Jime", 100000],
  ["Jardín", 30000],
  ["Otros", 50000],
  ["Seguro del auto", 60000],
];

const idCat = (nombre: string) =>
  "cat-" + nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\W+/g, "-");

export function datosDemo(fechaHoy = hoy()): Datos {
  const mes = mesDe(fechaHoy);
  const mesAnterior = sumarMeses(mes, -1);
  const diaHoy = Number(fechaHoy.slice(8, 10));

  const categorias: Categoria[] = CATEGORIAS.map(([nombre, techo], i) => ({
    id: idCat(nombre),
    nombre,
    orden: i,
    techo,
  }));

  const ingresos: Ingreso[] = [
    { id: "ing-g", miembroId: "gaston", concepto: "Sueldo", monto: 1800000, mes: null },
    { id: "ing-j", miembroId: "jime", concepto: "Sueldo", monto: 1200000, mes: null },
  ];

  const pagosFijos: PagoFijo[] = [
    { id: "pf-alquiler", concepto: "Alquiler + AySA + TM", categoriaId: idCat("Casa y servicios"), dia: 10, monto: 550000, esDeuda: false, activo: true },
    { id: "pf-luz", concepto: "Luz", categoriaId: idCat("Casa y servicios"), dia: 15, monto: 45000, esDeuda: false, activo: true },
    { id: "pf-internet", concepto: "Internet", categoriaId: idCat("Casa y servicios"), dia: 5, monto: 30000, esDeuda: false, activo: true },
    { id: "pf-prestamo", concepto: "Cuota préstamo", categoriaId: idCat("Deuda"), dia: 5, monto: 180000, esDeuda: true, activo: true },
    { id: "pf-tarjeta", concepto: "Plan tarjeta", categoriaId: idCat("Deuda"), dia: 20, monto: 95000, esDeuda: true, activo: true },
    { id: "pf-seguro", concepto: "Seguro del auto", categoriaId: idCat("Seguro del auto"), dia: 12, monto: 60000, esDeuda: false, activo: true },
    { id: "pf-escuela", concepto: "Cuota escuela", categoriaId: idCat("Izán"), dia: 10, monto: 90000, esDeuda: false, activo: true },
    // Compra en cuotas (ficticia): arrancó hace dos meses, va por la 3 de 6.
    { id: "pf-lavarropas", concepto: "Lavarropas", categoriaId: idCat("Deuda"), dia: 20, monto: 50000, esDeuda: true, activo: true, altaDesde: sumarMeses(mes, -2), cuotas: 6, tarjetaId: "tj-galicia" },
  ];

  let n = 0;
  const movimientos: Movimiento[] = [];
  const pagosMes: PagoMes[] = [];
  const mov = (m: Mes, dia: number, monto: number, cat: string, detalle: string, pagoPor: string) => {
    const fecha = fechaEnMes(m, dia);
    const id = `mov-demo-${++n}`;
    movimientos.push({ id, fecha, monto, categoriaId: idCat(cat), detalle, pagoPor, creadoEn: `${fecha}T12:00:00.000Z` });
    return id;
  };

  // Mes anterior: completo, con todos los fijos pagados.
  for (const pf of pagosFijos) {
    const movimientoId = mov(mesAnterior, pf.dia, pf.monto, nombreCat(categorias, pf.categoriaId), pf.concepto, pf.dia % 2 ? "jime" : "gaston");
    pagosMes.push({ id: `pm-${pf.id}-${mesAnterior}`, pagoFijoId: pf.id, mes: mesAnterior, monto: pf.monto, pagado: true, movimientoId });
  }
  mov(mesAnterior, 3, 210000, "Súper y comida", "Súper del mes", "gaston");
  mov(mesAnterior, 18, 190000, "Súper y comida", "Verdulería y carnicería", "jime");
  mov(mesAnterior, 22, 95000, "Delivery", "Pizzas", "gaston");
  mov(mesAnterior, 25, 70000, "Santino", "Zapatillas", "jime");

  // Mes actual: solo hasta hoy, con los fijos ya vencidos pagados.
  const gastosMes: [number, number, string, string, string][] = [
    [1, 185000, "Súper y comida", "Súper del mes", "gaston"],
    [2, 40000, "Nafta y transporte", "Nafta", "gaston"],
    [3, 25000, "Delivery", "Sushi", "jime"],
    [4, 35000, "Santino", "Peluquería", "jime"],
    [5, 12000, "Uber", "Al jardín", "gaston"],
    [6, 60000, "Salud", "Farmacia", "jime"],
    [7, 30000, "Entrenamientos", "Gimnasio", "jime"],
    [8, 45000, "Salidas con Jime", "Cine y cena", "gaston"],
    [9, 120000, "Súper y comida", "Mayorista", "jime"],
    [11, 42000, "Delivery", "Hamburguesas", "gaston"],
    [13, 48000, "Santino", "Útiles", "gaston"],
    [14, 25000, "Izán", "Peluquería", "jime"],
    [16, 38000, "Nafta y transporte", "Nafta", "jime"],
  ];
  for (const [dia, monto, cat, detalle, quien] of gastosMes) {
    if (dia <= diaHoy) mov(mes, dia, monto, cat, detalle, quien);
  }
  for (const pf of pagosFijos) {
    if (pf.dia < diaHoy) {
      const movimientoId = mov(mes, pf.dia, pf.monto, nombreCat(categorias, pf.categoriaId), pf.concepto, pf.monto > 100000 ? "gaston" : "jime");
      pagosMes.push({ id: `pm-${pf.id}-${mes}`, pagoFijoId: pf.id, mes, monto: pf.monto, pagado: true, movimientoId });
    }
  }

  return {
    miembros: [
      { id: "gaston", nombre: "Gastón" },
      { id: "jime", nombre: "Jime" },
    ],
    categorias,
    ingresos,
    movimientos,
    pagosFijos,
    pagosMes,
    // Ficticias: banco y últimos 4 inventados.
    tarjetas: [
      { id: "tj-galicia", banco: "Galicia", ultimos4: "1234", miembroId: "gaston", color: "salmon" },
      { id: "tj-bbva", banco: "BBVA", ultimos4: "5678", miembroId: "jime", color: "azul" },
    ],
  };
}


function nombreCat(categorias: Categoria[], id: string) {
  return categorias.find((c) => c.id === id)!.nombre;
}
