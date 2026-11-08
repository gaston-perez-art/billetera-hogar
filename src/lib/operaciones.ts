// Cambios sobre los datos, como funciones puras.
// El modo demo los usa para guardar en el navegador; el modo nube, para mostrar el
// cambio al instante mientras se guarda en Supabase (y la base confirma después).

import { cuotaDelMes } from "./calculos";
import { fechaEnMes, hoy, mesDe, sumarMeses } from "./formato";
import type { Datos, Ingreso, Mes, Movimiento, PagoFijo } from "./tipos";

export type NuevoMovimiento = Omit<Movimiento, "id" | "creadoEn">;
export type CambiosPagoFijo = Partial<Pick<PagoFijo, "concepto" | "monto" | "dia" | "activo" | "bajaDesde">>;
export type NuevoPagoFijo = Pick<PagoFijo, "concepto" | "categoriaId" | "dia" | "monto" | "esDeuda"> & {
  /** Compra en cuotas: cuántas son y en qué mes cae la primera. */
  cuotas?: number | null;
  primeraCuota?: Mes;
};

export function nuevoId() {
  return crypto.randomUUID();
}

/** Fecha del gasto al marcar un pago fijo: hoy si es el mes actual; si no, el día de vencimiento. */
export function fechaDePago(mes: Mes, dia: number, fechaHoy = hoy()) {
  return mesDe(fechaHoy) === mes ? fechaHoy : fechaEnMes(mes, dia);
}

/** Foto de perfil de un miembro (null la saca). */
export function cambiarFoto(d: Datos, miembroId: string, foto: string | null): Datos {
  return { ...d, miembros: d.miembros.map((m) => (m.id === miembroId ? { ...m, foto } : m)) };
}

export function agregarMovimiento(d: Datos, m: Movimiento): Datos {
  return { ...d, movimientos: [...d.movimientos, m] };
}

export type CambiosMovimiento = Partial<Pick<Movimiento, "monto" | "detalle">>;

/**
 * Corregir un gasto (o plata que entra) ya cargado: monto y detalle. No cambia el signo:
 * lo que entraba sigue entrando. Si venía de un pago fijo, el pago guarda el monto nuevo
 * (así Pagos y el saldo dicen lo mismo).
 */
export function editarMovimiento(d: Datos, id: string, cambios: CambiosMovimiento): Datos {
  const actual = d.movimientos.find((m) => m.id === id);
  if (!actual) return d;
  const monto = cambios.monto === undefined ? actual.monto : Math.sign(actual.monto || 1) * Math.abs(cambios.monto);
  const detalle = cambios.detalle === undefined ? actual.detalle : cambios.detalle.trim();
  return {
    ...d,
    movimientos: d.movimientos.map((m) => (m.id === id ? { ...m, monto, detalle } : m)),
    pagosMes: d.pagosMes.map((p) => (p.movimientoId === id ? { ...p, monto } : p)),
  };
}

/** Si el gasto venía de un pago fijo, el pago vuelve a quedar pendiente. */
export function borrarMovimiento(d: Datos, id: string): Datos {
  return {
    ...d,
    movimientos: d.movimientos.filter((m) => m.id !== id),
    pagosMes: d.pagosMes.map((p) => (p.movimientoId === id ? { ...p, pagado: false, movimientoId: undefined } : p)),
  };
}

/** Regla clave: marcar pagado CREA el gasto (en la planilla se olvidaba cargarlo). */
export function marcarPagado(
  d: Datos,
  pagoFijoId: string,
  mes: Mes,
  pagoPor: string,
  movimientoId: string,
  fechaHoy = hoy(),
): Datos {
  const pf = d.pagosFijos.find((p) => p.id === pagoFijoId);
  if (!pf) return d;
  const existente = d.pagosMes.find((p) => p.pagoFijoId === pagoFijoId && p.mes === mes);
  if (existente?.pagado) return d;
  const monto = existente?.monto ?? pf.monto;
  const movimiento: Movimiento = {
    id: movimientoId,
    fecha: fechaDePago(mes, pf.dia, fechaHoy),
    monto,
    categoriaId: pf.categoriaId,
    detalle: detalleDePago(pf, mes),
    pagoPor,
    creadoEn: new Date().toISOString(),
  };
  const registro = { id: existente?.id ?? nuevoId(), pagoFijoId, mes, monto, pagado: true, movimientoId };
  return {
    ...d,
    movimientos: [...d.movimientos, movimiento],
    pagosMes: existente ? d.pagosMes.map((p) => (p.id === existente.id ? registro : p)) : [...d.pagosMes, registro],
  };
}

/** Desmarcar borra el gasto que se había creado. */
export function desmarcarPagado(d: Datos, pagoFijoId: string, mes: Mes): Datos {
  const registro = d.pagosMes.find((p) => p.pagoFijoId === pagoFijoId && p.mes === mes);
  if (!registro?.pagado || !registro.movimientoId) return d;
  return borrarMovimiento(d, registro.movimientoId);
}

/** Categoría nueva al final de la lista, sin techo. */
export function agregarCategoria(d: Datos, id: string, nombre: string): Datos {
  const orden = Math.max(-1, ...d.categorias.map((c) => c.orden)) + 1;
  return { ...d, categorias: [...d.categorias, { id, nombre, orden, techo: 0 }] };
}

export function actualizarTecho(d: Datos, categoriaId: string, techo: number): Datos {
  return { ...d, categorias: d.categorias.map((c) => (c.id === categoriaId ? { ...c, techo } : c)) };
}

/**
 * Categorías con lógica atada al nombre (techo de Deuda, total de Santino, meses viejos de Chicos):
 * no se renombran o se rompen esas cuentas.
 */
export const CATEGORIAS_FIJAS = ["Deuda", "Santino", "Chicos"];

/** Cambiar el nombre de una categoría. Los gastos la siguen por id: no cambia nada del pasado. */
export function renombrarCategoria(d: Datos, categoriaId: string, nombre: string): Datos {
  const limpio = nombre.trim();
  const c = d.categorias.find((x) => x.id === categoriaId);
  if (!c || !limpio || CATEGORIAS_FIJAS.includes(c.nombre)) return d;
  return { ...d, categorias: d.categorias.map((x) => (x.id === categoriaId ? { ...x, nombre: limpio } : x)) };
}

/**
 * Ids de un ingreso y de sus versiones anteriores (mismo miembro, mismo nombre, que se repite):
 * al cambiar el sueldo se abre una versión nueva; el nombre se cambia en todas para que no queden dos.
 */
export function versionesIngreso(d: Datos, ingresoId: string): string[] {
  const i = d.ingresos.find((x) => x.id === ingresoId);
  if (!i) return [];
  if (i.mes !== null) return [i.id];
  return d.ingresos.filter((x) => x.mes === null && x.miembroId === i.miembroId && x.concepto === i.concepto).map((x) => x.id);
}

export function renombrarIngreso(d: Datos, ingresoId: string, concepto: string): Datos {
  const limpio = concepto.trim();
  const ids = versionesIngreso(d, ingresoId);
  if (!limpio || ids.length === 0) return d;
  return { ...d, ingresos: d.ingresos.map((x) => (ids.includes(x.id) ? { ...x, concepto: limpio } : x)) };
}

export type CambioIngreso =
  | { tipo: "monto"; id: string; monto: number }
  | { tipo: "nuevaVersion"; cerrar: { id: string; hasta: Mes }; nuevo: Ingreso };

/**
 * Cómo se cambia un ingreso desde un mes sin tocar los anteriores:
 * - Puntual, o que ya empieza en ese mes: se cambia el monto.
 * - Que se repite desde antes: se cierra el mes anterior y se abre uno nuevo desde ese mes.
 */
export function planCambioIngreso(d: Datos, ingresoId: string, monto: number, mes: Mes, nuevoIdIngreso: string): CambioIngreso | null {
  const i = d.ingresos.find((x) => x.id === ingresoId);
  if (!i) return null;
  if (i.mes !== null || (i.desde && i.desde >= mes)) return { tipo: "monto", id: i.id, monto };
  return {
    tipo: "nuevaVersion",
    cerrar: { id: i.id, hasta: sumarMeses(mes, -1) },
    nuevo: { ...i, id: nuevoIdIngreso, monto, desde: mes, hasta: i.hasta ?? null },
  };
}

export function aplicarCambioIngreso(d: Datos, c: CambioIngreso | null): Datos {
  if (!c) return d;
  if (c.tipo === "monto") return { ...d, ingresos: d.ingresos.map((i) => (i.id === c.id ? { ...i, monto: c.monto } : i)) };
  return {
    ...d,
    ingresos: [...d.ingresos.map((i) => (i.id === c.cerrar.id ? { ...i, hasta: c.cerrar.hasta } : i)), c.nuevo],
  };
}

/** Pago fijo nuevo: vale desde el mes elegido, los anteriores no cambian. */
export function agregarPagoFijo(d: Datos, pf: PagoFijo): Datos {
  return { ...d, pagosFijos: [...d.pagosFijos, pf] };
}

export function armarPagoFijo(nuevo: NuevoPagoFijo, mes: Mes, id = nuevoId()): PagoFijo {
  const { primeraCuota, cuotas, ...resto } = nuevo;
  const enCuotas = cuotas != null && cuotas > 0;
  return {
    ...resto,
    concepto: nuevo.concepto.trim(),
    id,
    activo: true,
    bajaDesde: null,
    altaDesde: enCuotas ? (primeraCuota ?? sumarMeses(mes, 1)) : mes,
    cuotas: enCuotas ? cuotas : null,
  };
}

/** Detalle del gasto que se crea al pagar: en cuotas lleva cuál ("Heladera, cuota 3 de 6"). Igual que marcar_pagado en SQL. */
export function detalleDePago(pf: PagoFijo, mes: Mes): string {
  const c = cuotaDelMes(pf, mes);
  return c ? `${pf.concepto}, cuota ${c.numero} de ${c.total}` : pf.concepto;
}

export function actualizarPagoFijo(d: Datos, pagoFijoId: string, cambios: CambiosPagoFijo): Datos {
  return { ...d, pagosFijos: d.pagosFijos.map((p) => (p.id === pagoFijoId ? { ...p, ...cambios } : p)) };
}
