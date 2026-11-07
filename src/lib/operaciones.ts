// Cambios sobre los datos, como funciones puras.
// El modo demo los usa para guardar en el navegador; el modo nube, para mostrar el
// cambio al instante mientras se guarda en Supabase (y la base confirma después).

import { fechaEnMes, hoy, mesDe, sumarMeses } from "./formato";
import type { Datos, Ingreso, Mes, Movimiento, PagoFijo } from "./tipos";

export type NuevoMovimiento = Omit<Movimiento, "id" | "creadoEn">;
export type CambiosPagoFijo = Partial<Pick<PagoFijo, "monto" | "dia" | "activo" | "bajaDesde">>;

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

export function actualizarPagoFijo(d: Datos, pagoFijoId: string, cambios: CambiosPagoFijo): Datos {
  return { ...d, pagosFijos: d.pagosFijos.map((p) => (p.id === pagoFijoId ? { ...p, ...cambios } : p)) };
}
