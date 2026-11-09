// Reglas de negocio (docs/reglas-de-negocio.md).
//
// En el POC se calculan en el cliente porque no hay base. Al conectar Supabase,
// estas funciones se reemplazan por las vistas v_categorias_mes / v_reparto_mes
// (ver CLAUDE.md: los cálculos viven en SQL, no duplicados en el frontend).
// Los tests de calculos.test.ts sirven como casos para validar esas vistas.

import { fechaEnMes, mesDe, sumarMeses } from "./formato";
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

/** Vale en el mes: ya estaba dado de alta, todavía no se dio de baja y, si es en cuotas, no terminó. */
export function pagoFijoVigente(pf: PagoFijo, mes: Mes): boolean {
  if (deBajaEn(pf, mes) || (pf.altaDesde && pf.altaDesde > mes)) return false;
  const cuota = cuotaDelMes(pf, mes);
  return !cuota || cuota.numero <= cuota.total;
}

/** Meses entre dos meses (b − a). */
export function mesesEntre(a: Mes, b: Mes): number {
  const [aa, am] = a.split("-").map(Number);
  const [ba, bm] = b.split("-").map(Number);
  return (ba - aa) * 12 + (bm - am);
}

/** Compra en cuotas con tarjeta (pestaña Tarjetas). Los préstamos también tienen cuotas, pero van aparte. */
export function esCompraEnCuotas(pf: PagoFijo): boolean {
  return !!pf.cuotas && !pf.prestamo;
}

/** Compra en cuotas: qué cuota cae en el mes ("cuota 3 de 6"). null si no es en cuotas. */
export function cuotaDelMes(pf: PagoFijo, mes: Mes): { numero: number; total: number } | null {
  if (!pf.cuotas || !pf.altaDesde) return null;
  return { numero: mesesEntre(pf.altaDesde, mes) + 1, total: pf.cuotas };
}

/** "Cuota 3 de 6", o null si no es en cuotas o el mes cae fuera de las cuotas. */
export function textoCuota(pf: PagoFijo, mes: Mes): string | null {
  const c = cuotaDelMes(pf, mes);
  return c && c.numero >= 1 && c.numero <= c.total ? `Cuota ${c.numero} de ${c.total}` : null;
}

/**
 * Lo que falta pagar de una compra en cuotas, desde el mes elegido hasta la última:
 * las cuotas sin pagar (con su monto guardado si ya tenían uno) y cuántas son.
 * Las de meses anteriores sin pagar no cuentan acá: quedaron en su mes.
 */
export function restaDeCompra(d: Datos, pf: PagoFijo, mes: Mes): { monto: number; cuotas: number } {
  const ultima = mesUltimaCuota(pf);
  if (!ultima || !pf.altaDesde) return { monto: 0, cuotas: 0 };
  let monto = 0;
  let cuotas = 0;
  for (let m = pf.altaDesde > mes ? pf.altaDesde : mes; m <= ultima; m = sumarMeses(m, 1)) {
    if (deBajaEn(pf, m)) break;
    const registro = d.pagosMes.find((p) => p.pagoFijoId === pf.id && p.mes === m);
    if (registro?.pagado) continue;
    monto += montoPendiente(d, pf, m, registro);
    cuotas++;
  }
  return { monto, cuotas };
}

export interface ResumenTarjeta {
  /** Cuotas de este mes con esta tarjeta (pagadas o no): lo mismo que suma Pagos → Fijos. */
  delMes: number;
  /** Lo que falta pagar desde este mes hasta la última cuota. */
  resta: number;
  /** Compras con cuota este mes. */
  compras: number;
  /** Mes de la última cuota de todas sus compras (null si no tiene nada pendiente). */
  hasta: Mes | null;
}

/** Cuánto va en una tarjeta en el mes (`null` = las compras sin tarjeta). */
export function resumenTarjeta(d: Datos, tarjetaId: string | null, mes: Mes): ResumenTarjeta {
  const deEsta = (pf: PagoFijo) => esCompraEnCuotas(pf) && (pf.tarjetaId ?? null) === tarjetaId;
  const pagos = pagosDelMes(d, mes).filter((p) => deEsta(p.pagoFijo));
  const restas = d.pagosFijos.filter(deEsta).map((pf) => ({ pf, r: restaDeCompra(d, pf, mes) }));
  const pendientes = restas.filter((x) => x.r.cuotas > 0);
  return {
    delMes: pagos.reduce((a, p) => a + p.monto, 0),
    resta: pendientes.reduce((a, x) => a + x.r.monto, 0),
    compras: pagos.length,
    hasta: pendientes.reduce<Mes | null>((a, x) => {
      const u = mesUltimaCuota(x.pf);
      return u && (!a || u > a) ? u : a;
    }, null),
  };
}

/** Última cuota de una compra (el mes en que termina). */
export function mesUltimaCuota(pf: PagoFijo): Mes | null {
  if (!pf.cuotas || !pf.altaDesde) return null;
  return sumarMeses(pf.altaDesde, pf.cuotas - 1);
}

/** Préstamo en dólares: deuda y cuota mínima en USD, se paga en pesos al dólar del día. */
export function esEnDolares(pf: PagoFijo): boolean {
  return !!pf.prestamo && !!pf.usdTotal && !!pf.usdCuota;
}

/** Dólar con el que se estima en pesos lo que falta: el del último pago (o el de la carga). */
export function dolarEstimado(pf: PagoFijo): number {
  return pf.usdCuota ? pf.monto / pf.usdCuota : 0;
}

const centavos = (n: number) => Math.round(n * 100) / 100;
const pagadosDe = (d: Datos, pf: PagoFijo) => d.pagosMes.filter((p) => p.pagoFijoId === pf.id && p.pagado);

/** Dólares ya pagados de un préstamo en dólares (un mes pagado sin el dato cuenta la cuota mínima). */
export function dolaresPagados(d: Datos, pf: PagoFijo): number {
  return centavos(suma(pagadosDe(d, pf).map((p) => p.usd ?? pf.usdCuota ?? 0)));
}

/** Lo que deben todavía, en dólares. */
export function saldoDolares(d: Datos, pf: PagoFijo): number {
  return Math.max(centavos((pf.usdTotal ?? 0) - dolaresPagados(d, pf)), 0);
}

/**
 * Cuántas cuotas tiene un préstamo en dólares según lo pagado: hasta el último mes pagado,
 * más las que hacen falta pagando el mínimo (los meses salteados también se llevan su parte).
 * Si un mes se puso más, termina antes.
 */
export function cuotasEnDolares(d: Datos, pf: PagoFijo): number {
  const c = pf.usdCuota ?? 0;
  if (!pf.altaDesde || c <= 0) return pf.cuotas ?? 1;
  const indices = pagadosDe(d, pf).map((p) => mesesEntre(pf.altaDesde!, p.mes) + 1).filter((i) => i >= 1);
  const ultimo = Math.max(0, ...indices);
  const salteados = ultimo - new Set(indices).size;
  const queda = saldoDolares(d, pf) - salteados * c;
  return Math.max(ultimo + Math.max(Math.ceil(queda / c - 1e-9), 0), 1);
}

/**
 * Dólares que le tocan a cada mes sin pagar, en orden: la cuota mínima hasta cubrir lo que deben
 * (la última puede ser menor). Suman lo que deben.
 */
export function dolaresPorMes(d: Datos, pf: PagoFijo): Map<Mes, number> {
  const r = new Map<Mes, number>();
  const ultima = mesUltimaCuota(pf);
  if (!esEnDolares(pf) || !pf.altaDesde || !ultima) return r;
  let queda = saldoDolares(d, pf);
  for (let m = pf.altaDesde; m <= ultima; m = sumarMeses(m, 1)) {
    if (deBajaEn(pf, m)) break;
    if (d.pagosMes.some((p) => p.pagoFijoId === pf.id && p.mes === m && p.pagado)) continue;
    const usd = centavos(Math.min(pf.usdCuota!, queda));
    r.set(m, usd);
    queda = centavos(queda - usd);
  }
  return r;
}

/** Monto de un mes sin pagar: el guardado o el de siempre; en dólares, su parte al dólar estimado. */
function montoPendiente(d: Datos, pf: PagoFijo, mes: Mes, registro?: { monto: number }): number {
  if (!esEnDolares(pf)) return registro?.monto ?? pf.monto;
  return Math.round((dolaresPorMes(d, pf).get(mes) ?? 0) * dolarEstimado(pf));
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
        monto: registro?.pagado ? registro.monto : montoPendiente(d, pf, mes, registro),
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
  /**
   * Lo que le falta poner para la casa en el mes: su parte del gasto previsto − lo que ya puso.
   * Negativo = puso de más; el otro se lo compensa al cerrar el mes.
   */
  faltaPoner: number;
  /**
   * Lo libre: su dinero hoy − lo que le falta poner (= lo que gana − su parte de la casa).
   * Es el mismo "Queda para {nombre}" de Reparto (`leQuedaPlan`). No depende de quién pagó
   * primero: si uno se adelantó a pagar, el otro tiene que poner más de lo que falta.
   * Los dos suman el sobrante (el "Libre" de Inicio cuando no es negativo).
   */
  libre: number;
}

/**
 * "Te queda para gastar" de cada uno. Es la misma cuenta de Inicio, persona por persona:
 * lo que le entra, menos lo que ya puso, menos su parte (por ingreso) de lo que falta pagar y del ahorro.
 */
export function paraGastarPorPersona(d: Datos, mes: Mes): ParaGastarPersona[] {
  const plan = planMes(d, mes);
  const previsto = gastoPrevisto(d, mes);
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
      faltaPoner: previsto * proporcion - puso,
      libre: ingresa - previsto * proporcion,
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

export interface LogroPagos {
  /** Hay pagos fijos en el mes y están todos pagados. */
  completo: boolean;
  cantidad: number;
  total: number;
  /** Cuántos se pagaron el día del vencimiento o antes, entre los que tienen el gasto cargado. */
  aTiempo: number;
  conFecha: number;
  /** Quién puso cuánto, según quién figura como "pagó" en el gasto que se creó al marcarlo. */
  porPersona: { miembroId: string; monto: number; cantidad: number }[];
}

/** El mes de pagos fijos cerrado: cuántos, cuánto, cuántos a tiempo y quién los pagó. */
export function logroPagos(d: Datos, mes: Mes): LogroPagos {
  const pagos = pagosDelMes(d, mes);
  const pagados = pagos.filter((p) => p.pagado);
  let aTiempo = 0;
  let conFecha = 0;
  const porPersona = new Map<string, { monto: number; cantidad: number }>();
  for (const p of pagados) {
    const mov = d.movimientos.find((m) => m.id === p.movimientoId);
    if (!mov) continue;
    conFecha++;
    if (mov.fecha <= fechaEnMes(mes, p.pagoFijo.dia)) aTiempo++;
    const actual = porPersona.get(mov.pagoPor) ?? { monto: 0, cantidad: 0 };
    porPersona.set(mov.pagoPor, { monto: actual.monto + p.monto, cantidad: actual.cantidad + 1 });
  }
  return {
    completo: pagos.length > 0 && pagados.length === pagos.length,
    cantidad: pagos.length,
    total: suma(pagos.map((p) => p.monto)),
    aTiempo,
    conFecha,
    porPersona: d.miembros.flatMap((m) => {
      const x = porPersona.get(m.id);
      return x ? [{ miembroId: m.id, ...x }] : [];
    }),
  };
}

/** Los gastos de una categoría en el mes, para revisarlos. Con `miembroId`, solo los que cargó esa persona. */
export function gastosDeCategoria(d: Datos, mes: Mes, categoriaId: string, miembroId?: string): Movimiento[] {
  return movimientosDelMes(d, mes).filter((m) => m.categoriaId === categoriaId && (!miembroId || m.pagoPor === miembroId));
}

/** Nombre de la categoría donde va la plata apartada (la reserva de ahorro). */
export const CATEGORIA_AHORRO = "Ahorro";

export interface Ahorro {
  /** Lo que hay apartado hoy: todo lo que se apartó menos lo que se retiró, de todos los meses. */
  saldo: number;
  /** Lo apartado neto de cada uno (apartó − retiró). */
  porPersona: { miembroId: string; monto: number }[];
  /** Neto del mes elegido (positivo = apartaron, negativo = retiraron). */
  delMes: number;
  /** Movimientos de la reserva, del más nuevo al más viejo. */
  movimientos: Movimiento[];
}

/**
 * La reserva de ahorro. Apartar es un movimiento positivo en la categoría Ahorro (sale de lo
 * que tienen, como un gasto); retirar, uno negativo (vuelve, como la plata que entra).
 */
export function ahorro(d: Datos, mes?: Mes): Ahorro {
  const cat = d.categorias.find((c) => c.nombre === CATEGORIA_AHORRO);
  const movs = cat
    ? d.movimientos
        .filter((m) => m.categoriaId === cat.id)
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn))
    : [];
  return {
    saldo: suma(movs.map((m) => m.monto)),
    porPersona: d.miembros.map((m) => ({ miembroId: m.id, monto: suma(movs.filter((x) => x.pagoPor === m.id).map((x) => x.monto)) })),
    delMes: mes ? suma(movs.filter((m) => mesDe(m.fecha) === mes).map((m) => m.monto)) : 0,
    movimientos: movs,
  };
}

export interface Deudas {
  /** Cuotas del mes elegido, pagadas o no: lo mismo que suman Tarjetas y Préstamos. */
  delMes: { tarjetas: number; prestamos: number };
  /** Lo que falta pagar desde el mes elegido hasta la última cuota. */
  resta: { tarjetas: number; prestamos: number };
  /** Lo que deben en dólares (en `resta` va en pesos, al dólar estimado). */
  usd: number;
  /** Mes por mes desde el elegido, mientras haya cuotas: tarjetas y préstamos (pagadas o no). */
  porMes: { mes: Mes; tarjetas: number; prestamos: number }[];
}

/** Lo que deben entre tarjetas y préstamos: el mes, el total y los meses que vienen. */
export function deudas(d: Datos, mes: Mes, meses = 12): Deudas {
  const deTarjeta = (pf: PagoFijo) => esCompraEnCuotas(pf);
  const dePrestamo = (pf: PagoFijo) => !!pf.prestamo && !!pf.cuotas;
  const delMesEn = (m: Mes) => {
    const pagos = pagosDelMes(d, m);
    return {
      mes: m,
      tarjetas: suma(pagos.filter((p) => deTarjeta(p.pagoFijo)).map((p) => p.monto)),
      prestamos: suma(pagos.filter((p) => dePrestamo(p.pagoFijo)).map((p) => p.monto)),
    };
  };
  const porMes = Array.from({ length: meses }, (_, i) => delMesEn(sumarMeses(mes, i)));
  while (porMes.length > 1 && porMes[porMes.length - 1].tarjetas + porMes[porMes.length - 1].prestamos === 0) porMes.pop();
  const resta = (f: (pf: PagoFijo) => boolean) => suma(d.pagosFijos.filter(f).map((pf) => restaDeCompra(d, pf, mes).monto));
  return {
    delMes: { tarjetas: porMes[0].tarjetas, prestamos: porMes[0].prestamos },
    resta: { tarjetas: resta(deTarjeta), prestamos: resta(dePrestamo) },
    usd: centavos(suma(d.pagosFijos.filter((pf) => esEnDolares(pf) && pagoFijoVigenteOFuturo(pf, mes)).map((pf) => saldoDolares(d, pf)))),
    porMes,
  };
}

/** Vale en el mes o empieza más adelante (no terminó ni se dio de baja). */
function pagoFijoVigenteOFuturo(pf: PagoFijo, mes: Mes): boolean {
  return pagoFijoVigente(pf, mes) || (pf.activo && !!pf.altaDesde && pf.altaDesde > mes);
}
