// Reglas de negocio (docs/reglas-de-negocio.md).
//
// En el POC se calculan en el cliente porque no hay base. Al conectar Supabase,
// estas funciones se reemplazan por las vistas v_categorias_mes / v_reparto_mes
// (ver CLAUDE.md: los cálculos viven en SQL, no duplicados en el frontend).
// Los tests de calculos.test.ts sirven como casos para validar esas vistas.

import { mesDe } from "./formato";
import type { Categoria, Datos, Fecha, Ingreso, Mes, Movimiento, PagoFijo } from "./tipos";

const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function movimientosDelMes(d: Datos, mes: Mes): Movimiento[] {
  return d.movimientos
    .filter((m) => mesDe(m.fecha) === mes)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn));
}

/** Si un ingreso vale en el mes: el puntual, en su mes; el que se repite, dentro de su vigencia. */
export function ingresoVigente(i: Ingreso, mes: Mes): boolean {
  if (i.mes !== null) return i.mes === mes;
  return (!i.desde || i.desde <= mes) && (!i.hasta || i.hasta >= mes);
}

export function ingresosDelMes(d: Datos, mes: Mes, miembroId?: string): number {
  return suma(
    d.ingresos
      .filter((i) => ingresoVigente(i, mes))
      .filter((i) => !miembroId || i.miembroId === miembroId)
      .map((i) => i.monto),
  );
}

/** Dado de baja en ese mes. Sin fecha de baja (datos viejos): de baja en todos los meses. */
export function deBajaEn(pf: PagoFijo, mes: Mes): boolean {
  return !pf.activo && (!pf.bajaDesde || pf.bajaDesde <= mes);
}

/** Vale en el mes: ya estaba dado de alta y todavía no se dio de baja. */
export function pagoFijoVigente(pf: PagoFijo, mes: Mes): boolean {
  return !deBajaEn(pf, mes) && (!pf.altaDesde || pf.altaDesde <= mes);
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
      // Fuera de vigencia solo aparece si ese mes ya se pagó (un registro sin pagar, por
      // ejemplo de un pago que se desmarcó, no lo trae de vuelta).
      if (!pagoFijoVigente(pf, mes) && !registro?.pagado) return [];
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
  /** Pagos fijos de esta categoría que faltan pagar en el mes (ya están comprometidos). */
  pendiente: number;
  /**
   * Lo que se puede gastar todavía en la categoría: lo que queda del techo (sin contar lo que
   * se pasó) menos los pagos fijos que faltan. La suma de todas = "te queda para gastar" de Inicio.
   */
  libre: number;
}

/** En qué se va. El techo de Deuda = techo base + cuotas fijas marcadas como deuda en el mes. */
export function categoriasDelMes(d: Datos, mes: Mes): CategoriaDelMes[] {
  const movs = movimientosDelMes(d, mes);
  const pagos = pagosDelMes(d, mes);
  const cuotasDeuda = suma(pagos.filter((p) => p.pagoFijo.esDeuda).map((p) => p.monto));
  return [...d.categorias]
    .sort((a, b) => a.orden - b.orden)
    .map((categoria) => {
      const gastado = suma(movs.filter((m) => m.categoriaId === categoria.id).map((m) => m.monto));
      const techo = categoria.techo + (categoria.nombre === "Deuda" ? cuotasDeuda : 0);
      const pendiente = suma(pagos.filter((p) => !p.pagado && p.pagoFijo.categoriaId === categoria.id).map((p) => p.monto));
      return { categoria, gastado, techo, queda: techo - gastado, pendiente, libre: Math.max(techo - gastado, 0) - pendiente };
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
  entra: number;
  gastado: number;
  /** Saldo: la plata que tienen, entre los dos. entra − gastado. */
  saldo: number;
  /** Pagos fijos que faltan este mes. */
  faltan: number;
  /**
   * Lo que sobra después de la casa: entra − gasto previsto (la suma de los techos, o lo gastado
   * si se pasaron). Negativo = los gastos de la casa superan lo que entra.
   */
  sobrante: number;
  /**
   * Lo que queda para cada uno después de poner su parte de la casa (sumado entre los dos).
   * Es el sobrante, o 0 si no hay. Responde "¿cuánto me queda para mí?".
   */
  paraCadaUno: number;
  /**
   * Lo que queda para gastos de la casa: entra − gastado − pagos que faltan − para cada uno.
   * Es lo que se puede gastar sin tocar el ahorro. Negativo = ya se comieron parte del ahorro.
   */
  paraGastar: number;
}

/** La cuenta de Inicio, de arriba hacia abajo: entra, menos gastado, menos pagos que faltan, menos ahorro. */
export function planMes(d: Datos, mes: Mes): PlanMes {
  const { entra, gastado, faltan, teQueda } = resumenMes(d, mes);
  const sobrante = entra - gastoPrevisto(d, mes);
  const paraCadaUno = Math.max(sobrante, 0);
  return { entra, gastado, saldo: entra - gastado, faltan, sobrante, paraCadaUno, paraGastar: teQueda - paraCadaUno };
}

/**
 * Saldo al cierre de cada día con gastos del mes: lo que entró en el mes menos lo gastado
 * hasta ese día inclusive. El del último día es el saldo de la tarjeta de Inicio.
 */
export function saldoPorDia(d: Datos, mes: Mes): Map<Fecha, number> {
  const entra = ingresosDelMes(d, mes);
  const movs = movimientosDelMes(d, mes);
  const fechas = [...new Set(movs.map((m) => m.fecha))].sort();
  const resultado = new Map<Fecha, number>();
  for (const fecha of fechas) {
    resultado.set(fecha, entra - suma(movs.filter((m) => m.fecha <= fecha).map((m) => m.monto)));
  }
  return resultado;
}

export interface ParaGastarPersona {
  miembroId: string;
  nombre: string;
  /** Lo que le entra en el mes. */
  ingresa: number;
  proporcion: number;
  /** Lo que ya puso (gastos cargados a su nombre). */
  puso: number;
  /** Su saldo: lo que le entró menos lo que ya puso. Los dos suman el saldo de Inicio. */
  saldo: number;
  /** Su parte de los pagos fijos que faltan, según lo que gana. */
  parteFaltan: number;
  /** Lo que le queda para sí después de poner su parte de la casa (= lo que gana − lo que le toca). */
  propio: number;
  /** ingresa − puso − su parte de los pagos que faltan − lo propio. Suman "para gastar" de Inicio. */
  paraGastar: number;
}

/**
 * "Te queda para gastar" de cada uno. Es la misma cuenta de Inicio, persona por persona:
 * lo que le entra, menos lo que ya puso, menos su parte (por ingreso) de lo que falta pagar y del ahorro.
 */
export function paraGastarPorPersona(d: Datos, mes: Mes): ParaGastarPersona[] {
  const plan = planMes(d, mes);
  const movs = movimientosDelMes(d, mes);
  return d.miembros.map((m) => {
    const ingresa = ingresosDelMes(d, mes, m.id);
    const proporcion = plan.entra > 0 ? ingresa / plan.entra : 1 / d.miembros.length;
    const puso = suma(movs.filter((mv) => mv.pagoPor === m.id).map((mv) => mv.monto));
    const parteFaltan = plan.faltan * proporcion;
    const propio = plan.paraCadaUno * proporcion;
    return {
      miembroId: m.id,
      nombre: m.nombre,
      ingresa,
      proporcion,
      puso,
      saldo: ingresa - puso,
      parteFaltan,
      propio,
      paraGastar: ingresa - puso - parteFaltan - propio,
    };
  });
}

export interface EstadisticasPersona {
  /** Lo que pagó en el mes sin contar pagos fijos ni plata que entra. */
  total: number;
  cantidad: number;
  /** Categorías donde más gastó (sin pagos fijos), de mayor a menor. `parte` = monto / total. */
  categorias: { categoria: Categoria; monto: number; parte: number }[];
  /** El gasto más grande del mes (sin pagos fijos). */
  mayor?: Movimiento;
  /** Lo que pagó en pagos fijos marcados como pagados. */
  fijos: number;
  /** El mismo `total` del mes anterior, para comparar. */
  totalAnterior: number;
}

/**
 * En qué gasta cada uno. Separa los pagos fijos (alquiler, cuotas) porque siempre ganan
 * y no dicen nada: lo interesante es el gasto del día a día.
 */
export function estadisticasPersona(d: Datos, mes: Mes, miembroId: string, mesAnterior: Mes): EstadisticasPersona {
  const deFijos = new Set(d.pagosMes.map((p) => p.movimientoId).filter(Boolean));
  const suyos = (m: Mes) => movimientosDelMes(d, m).filter((mv) => mv.pagoPor === miembroId && mv.monto > 0);
  const delMes = suyos(mes);
  const variables = delMes.filter((mv) => !deFijos.has(mv.id));
  const total = suma(variables.map((mv) => mv.monto));
  const porCategoria = new Map<string, number>();
  for (const mv of variables) porCategoria.set(mv.categoriaId, (porCategoria.get(mv.categoriaId) ?? 0) + mv.monto);
  const categorias = [...porCategoria]
    .flatMap(([id, monto]) => {
      const categoria = d.categorias.find((c) => c.id === id);
      return categoria ? [{ categoria, monto, parte: total > 0 ? monto / total : 0 }] : [];
    })
    .sort((a, b) => b.monto - a.monto);
  const mayor = variables.reduce<Movimiento | undefined>((a, mv) => (!a || mv.monto > a.monto ? mv : a), undefined);
  return {
    total,
    cantidad: variables.length,
    categorias,
    mayor,
    fijos: suma(delMes.filter((mv) => deFijos.has(mv.id)).map((mv) => mv.monto)),
    totalAnterior: suma(suyos(mesAnterior).filter((mv) => !deFijos.has(mv.id)).map((mv) => mv.monto)),
  };
}

export interface GastosDe {
  /** Lo que gastó en el mes (incluye pagos fijos que pagó; sin la plata que entra). */
  gastado: number;
  /** Plata que entró a su nombre sin ser ingreso (montos negativos), en positivo. */
  entro: number;
  cantidad: number;
  /** Por categoría, de mayor a menor. `parte` = monto / gastado. */
  categorias: { categoria: Categoria; monto: number; cantidad: number; parte: number }[];
}

/**
 * Vista "Solo yo": lo que cargó una persona en el mes. Entre los dos,
 * gastado − entró suma lo gastado de Inicio.
 */
export function gastosDe(d: Datos, mes: Mes, miembroId: string): GastosDe {
  const suyos = movimientosDelMes(d, mes).filter((mv) => mv.pagoPor === miembroId);
  const gastos = suyos.filter((mv) => mv.monto > 0);
  const gastado = suma(gastos.map((mv) => mv.monto));
  const porCategoria = new Map<string, { monto: number; cantidad: number }>();
  for (const mv of gastos) {
    const c = porCategoria.get(mv.categoriaId) ?? { monto: 0, cantidad: 0 };
    porCategoria.set(mv.categoriaId, { monto: c.monto + mv.monto, cantidad: c.cantidad + 1 });
  }
  return {
    gastado,
    entro: -suma(suyos.filter((mv) => mv.monto < 0).map((mv) => mv.monto)),
    cantidad: gastos.length,
    categorias: [...porCategoria]
      .flatMap(([id, c]) => {
        const categoria = d.categorias.find((x) => x.id === id);
        return categoria ? [{ categoria, ...c, parte: gastado > 0 ? c.monto / gastado : 0 }] : [];
      })
      .sort((a, b) => b.monto - a.monto),
  };
}
