// Cambios sobre los datos, como funciones puras.
// El modo demo los usa para guardar en el navegador; el modo nube, para mostrar el
// cambio al instante mientras se guarda en Supabase (y la base confirma después).

import { fechaEnMes, hoy, mesDe } from "./formato";
import type { Datos, Mes, Movimiento, PagoFijo } from "./tipos";

export type NuevoMovimiento = Omit<Movimiento, "id" | "creadoEn">;
export type CambiosPagoFijo = Partial<Pick<PagoFijo, "monto" | "dia" | "activo">>;

export function nuevoId() {
  return crypto.randomUUID();
}

/** Fecha del gasto al marcar un pago fijo: hoy si es el mes actual; si no, el día de vencimiento. */
export function fechaDePago(mes: Mes, dia: number, fechaHoy = hoy()) {
  return mesDe(fechaHoy) === mes ? fechaHoy : fechaEnMes(mes, dia);
}

export function agregarMovimiento(d: Datos, m: Movimiento): Datos {
  return { ...d, movimientos: [...d.movimientos, m] };
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
    detalle: pf.concepto,
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

export function actualizarIngreso(d: Datos, ingresoId: string, monto: number): Datos {
  return { ...d, ingresos: d.ingresos.map((i) => (i.id === ingresoId ? { ...i, monto } : i)) };
}

export function actualizarPagoFijo(d: Datos, pagoFijoId: string, cambios: CambiosPagoFijo): Datos {
  return { ...d, pagosFijos: d.pagosFijos.map((p) => (p.id === pagoFijoId ? { ...p, ...cambios } : p)) };
}
