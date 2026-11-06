// Reglas de negocio (docs/reglas-de-negocio.md).
//
// En el POC se calculan en el cliente porque no hay base. Al conectar Supabase,
// estas funciones se reemplazan por las vistas v_categorias_mes / v_reparto_mes
// (ver CLAUDE.md: los cálculos viven en SQL, no duplicados en el frontend).
// Los tests de calculos.test.ts sirven como casos para validar esas vistas.

import { mesDe } from "./formato";
import type { Categoria, Datos, Fecha, Mes, Movimiento, PagoFijo } from "./tipos";

const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function movimientosDelMes(d: Datos, mes: Mes): Movimiento[] {
  return d.movimientos
    .filter((m) => mesDe(m.fecha) === mes)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn));
}

export function ingresosDelMes(d: Datos, mes: Mes, miembroId?: string): number {
  return suma(
    d.ingresos
      .filter((i) => i.mes === null || i.mes === mes)
      .filter((i) => !miembroId || i.miembroId === miembroId)
      .map((i) => i.monto),
  );
}

export interface PagoDelMes {
  pagoFijo: PagoFijo;
  mes: Mes;
  monto: number;
  pagado: boolean;
  movimientoId?: string;
}

/** Pagos fijos del mes, por día de vencimiento y, dentro del día, por monto descendente. */
export function pagosDelMes(d: Datos, mes: Mes): PagoDelMes[] {
  return d.pagosFijos
    .flatMap((pf): PagoDelMes[] => {
      const registro = d.pagosMes.find((p) => p.pagoFijoId === pf.id && p.mes === mes);
      if (!pf.activo && !registro) return [];
      return [{
        pagoFijo: pf,
        mes,
        monto: registro?.monto ?? pf.monto,
        pagado: registro?.pagado ?? false,
        movimientoId: registro?.movimientoId,
      }];
    })
    .sort((a, b) => a.pagoFijo.dia - b.pagoFijo.dia || b.monto - a.monto);
}

export interface CategoriaDelMes {
  categoria: Categoria;
  gastado: number;
  techo: number;
  /** techo − gastado. Positivo = queda (verde), negativo = te pasaste (rojo). */
  queda: number;
}

/** En qué se va. El techo de Deuda = techo base + cuotas fijas marcadas como deuda en el mes. */
export function categoriasDelMes(d: Datos, mes: Mes): CategoriaDelMes[] {
  const movs = movimientosDelMes(d, mes);
  const cuotasDeuda = suma(pagosDelMes(d, mes).filter((p) => p.pagoFijo.esDeuda).map((p) => p.monto));
  return [...d.categorias]
    .sort((a, b) => a.orden - b.orden)
    .map((categoria) => {
      const gastado = suma(movs.filter((m) => m.categoriaId === categoria.id).map((m) => m.monto));
      const techo = categoria.techo + (categoria.nombre === "Deuda" ? cuotasDeuda : 0);
      return { categoria, gastado, techo, queda: techo - gastado };
    });
}

export interface ResumenMes {
  entra: number;
  gastado: number;
  faltan: number;
  /** entra − gastado − pagos que faltan */
  teQueda: number;
}

export function resumenMes(d: Datos, mes: Mes): ResumenMes {
  const entra = ingresosDelMes(d, mes);
  const gastado = suma(movimientosDelMes(d, mes).map((m) => m.monto));
  const faltan = suma(pagosDelMes(d, mes).filter((p) => !p.pagado).map((p) => p.monto));
  return { entra, gastado, faltan, teQueda: entra - gastado - faltan };
}

/** Gasto previsto = Σ por categoría de max(techo, gastado). */
export function gastoPrevisto(d: Datos, mes: Mes): number {
  return suma(categoriasDelMes(d, mes).map((c) => Math.max(c.techo, c.gastado)));
}

export interface RepartoMiembro {
  miembroId: string;
  nombre: string;
  ingresa: number;
  proporcion: number;
  leToca: number;
  leQuedaPlan: number;
  puso: number;
  leQuedaReal: number;
  /** le queda real − le queda plan. Positivo (verde) = puso menos de lo que le tocaba. */
  diferencia: number;
}

export function repartoMes(d: Datos, mes: Mes): { previsto: number; miembros: RepartoMiembro[] } {
  const previsto = gastoPrevisto(d, mes);
  const total = ingresosDelMes(d, mes);
  const movs = movimientosDelMes(d, mes);
  const miembros = d.miembros.map((m) => {
    const ingresa = ingresosDelMes(d, mes, m.id);
    const proporcion = total > 0 ? ingresa / total : 0;
    const leToca = previsto * proporcion;
    const puso = suma(movs.filter((mv) => mv.pagoPor === m.id).map((mv) => mv.monto));
    const leQuedaPlan = ingresa - leToca;
    const leQuedaReal = ingresa - puso;
    return {
      miembroId: m.id,
      nombre: m.nombre,
      ingresa,
      proporcion,
      leToca,
      leQuedaPlan,
      puso,
      leQuedaReal,
      diferencia: leQuedaReal - leQuedaPlan,
    };
  });
  return { previsto, miembros };
}

/**
 * Lo previsto del mes separado en fijos (los pagos fijos del mes) y variables (el resto:
 * súper, nafta, salidas…). Sirve para explicar a cada uno de dónde sale lo que le toca.
 */
export function previstoPorTipo(d: Datos, mes: Mes): { fijos: number; variables: number } {
  const previsto = gastoPrevisto(d, mes);
  const fijos = Math.min(suma(pagosDelMes(d, mes).map((p) => p.monto)), previsto);
  return { fijos, variables: previsto - fijos };
}

/**
 * Gastos de Santino: categoría Santino. Para meses viejos (antes de separar
 * Chicos en Izán y Santino) también suma Chicos con detalle que arranca con "Santino".
 */
export function totalSantino(d: Datos, mes: Mes): number {
  const santino = d.categorias.find((c) => c.nombre === "Santino");
  const chicos = d.categorias.find((c) => c.nombre === "Chicos");
  return suma(
    movimientosDelMes(d, mes)
      .filter(
        (m) =>
          m.categoriaId === santino?.id ||
          (m.categoriaId === chicos?.id && m.detalle.trim().toLowerCase().startsWith("santino")),
      )
      .map((m) => m.monto),
  );
}

export interface PlanMes {
  /** Lo ideal para ahorrar: entra − gasto previsto. Negativo = el presupuesto supera lo que entra. */
  ahorroIdeal: number;
  /**
   * Lo que todavía se puede gastar sin pasarse de los techos: te queda − ahorro ideal
   * (= lo que falta usar de cada techo, menos los pagos fijos que faltan). Negativo = se pasaron.
   */
  puedenGastar: number;
}

export function planMes(d: Datos, mes: Mes): PlanMes {
  const { entra, teQueda } = resumenMes(d, mes);
  const ahorroIdeal = entra - gastoPrevisto(d, mes);
  return { ahorroIdeal, puedenGastar: teQueda - ahorroIdeal };
}

/**
 * "Te quedaba" al cierre de cada día con gastos del mes, para la actividad de Inicio.
 * Parte del "te queda" de hoy y le devuelve lo que se gastó después de ese día.
 * Los gastos que salen de un pago fijo no se devuelven: ese día ya contaban como "por pagar".
 */
export function quedabaPorDia(d: Datos, mes: Mes): Map<Fecha, number> {
  const { teQueda } = resumenMes(d, mes);
  const deFijos = new Set(d.pagosMes.filter((p) => p.pagado && p.movimientoId).map((p) => p.movimientoId));
  const movs = movimientosDelMes(d, mes);
  const fechas = [...new Set(movs.map((m) => m.fecha))].sort();
  const resultado = new Map<Fecha, number>();
  for (const fecha of fechas) {
    const despues = suma(movs.filter((m) => m.fecha > fecha && !deFijos.has(m.id)).map((m) => m.monto));
    resultado.set(fecha, teQueda + despues);
  }
  return resultado;
}
