// Traducción entre las tablas de Supabase y los tipos que usan las pantallas.
// Funciones puras (salvo cargarHogar), para poder testearlas sin base.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ajustarCuotasEnDolares } from "./operaciones";
import type { Datos, Mes, Miembro } from "./tipos";

type FilaTarjeta = { id: string; banco: string; ultimos4: string; miembro_id: string };

export interface Filas {
  miembros: { id: string; nombre: string; user_id: string; foto?: string | null }[];
  categorias: { id: string; nombre: string; orden: number }[];
  techos: { id: string; categoria_id: string; mes: string; monto: number | string }[];
  ingresos: {
    id: string;
    miembro_id: string;
    concepto: string;
    monto: number | string;
    mes: string | null;
    desde?: string | null;
    hasta?: string | null;
  }[];
  movimientos: {
    id: string;
    fecha: string;
    monto: number | string;
    categoria_id: string;
    detalle: string | null;
    medio: string | null;
    pago_por: string;
    created_at: string;
  }[];
  pagos_fijos: {
    id: string;
    concepto: string;
    categoria_id: string;
    dia: number;
    monto: number | string;
    es_deuda: boolean;
    activo: boolean;
    baja_desde?: string | null;
    alta_desde?: string | null;
    cuotas?: number | null;
    tarjeta_id?: string | null;
    /** Sin valor si todavía no se corrió 0008_prestamos.sql. */
    prestamo?: boolean | null;
    uva?: boolean | null;
    /** Sin valor si todavía no se corrió 0009_dolares.sql. */
    usd_total?: number | string | null;
    usd_cuota?: number | string | null;
  }[];
  /** Vacía si todavía no se corrió 0007_tarjetas.sql. */
  tarjetas?: FilaTarjeta[];
  pagos_mes: {
    id: string;
    pago_fijo_id: string;
    mes: string;
    monto: number | string;
    pagado: boolean;
    movimiento_id: string | null;
    usd?: number | string | null;
  }[];
}

const num = (v: number | string) => Number(v);

/**
 * Techo vigente de una categoría en un mes: el último cargado en ese mes o antes.
 * Así un techo se define una vez y sigue valiendo hasta que se cambie.
 */
export function techoVigente(techos: Filas["techos"], categoriaId: string, mes: Mes): number {
  let mejor: Filas["techos"][number] | undefined;
  for (const t of techos) {
    if (t.categoria_id !== categoriaId || t.mes > mes) continue;
    if (!mejor || t.mes > mejor.mes) mejor = t;
  }
  return mejor ? num(mejor.monto) : 0;
}

export function filasADatos(f: Filas, mes: Mes): Datos {
  // Las cuotas de un préstamo en dólares salen de lo pagado.
  return ajustarCuotasEnDolares({
    miembros: f.miembros.map((m) => ({ id: m.id, nombre: m.nombre, foto: m.foto ?? null })),
    categorias: f.categorias.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      orden: c.orden,
      techo: techoVigente(f.techos, c.id, mes),
    })),
    ingresos: f.ingresos.map((i) => ({
      id: i.id,
      miembroId: i.miembro_id,
      concepto: i.concepto,
      monto: num(i.monto),
      mes: i.mes,
      desde: i.desde ?? null,
      hasta: i.hasta ?? null,
    })),
    movimientos: f.movimientos.map((m) => ({
      id: m.id,
      fecha: m.fecha,
      monto: num(m.monto),
      categoriaId: m.categoria_id,
      detalle: m.detalle ?? "",
      medio: m.medio ?? undefined,
      pagoPor: m.pago_por,
      creadoEn: m.created_at,
    })),
    pagosFijos: f.pagos_fijos.map((p) => ({
      id: p.id,
      concepto: p.concepto,
      categoriaId: p.categoria_id,
      dia: p.dia,
      monto: num(p.monto),
      esDeuda: p.es_deuda,
      activo: p.activo,
      bajaDesde: p.baja_desde ?? null,
      altaDesde: p.alta_desde ?? null,
      cuotas: p.cuotas ?? null,
      tarjetaId: p.tarjeta_id ?? null,
      ...(p.prestamo ? { prestamo: true, uva: !!p.uva } : {}),
      ...(p.prestamo && p.usd_total != null && p.usd_cuota != null ? { usdTotal: num(p.usd_total), usdCuota: num(p.usd_cuota) } : {}),
    })),
    tarjetas: (f.tarjetas ?? []).map((t) => ({ id: t.id, banco: t.banco, ultimos4: t.ultimos4, miembroId: t.miembro_id })),
    pagosMes: f.pagos_mes.map((p) => ({
      id: p.id,
      pagoFijoId: p.pago_fijo_id,
      mes: p.mes,
      monto: num(p.monto),
      pagado: p.pagado,
      movimientoId: p.movimiento_id ?? undefined,
      ...(p.usd != null ? { usd: num(p.usd) } : {}),
    })),
  });
}

/** Supabase devuelve como mucho 1000 filas por pedido: se piden de a páginas. */
async function todas<T>(pedir: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const PAGINA = 1000;
  const filas: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await pedir(desde, desde + PAGINA - 1);
    if (error) throw error;
    filas.push(...(data ?? []));
    if (!data || data.length < PAGINA) return filas;
  }
}

export async function cargarHogar(sb: SupabaseClient, hogarId: string): Promise<Filas> {
  const tabla = <T,>(nombre: string, orden: string) =>
    todas<T>((desde, hasta) => sb.from(nombre).select("*").eq("hogar_id", hogarId).order(orden).range(desde, hasta));
  const [miembros, categorias, techos, ingresos, movimientos, pagos_fijos, pagos_mes] = await Promise.all([
    tabla<Filas["miembros"][number]>("miembros", "nombre"),
    tabla<Filas["categorias"][number]>("categorias", "orden"),
    tabla<Filas["techos"][number]>("techos", "mes"),
    tabla<Filas["ingresos"][number]>("ingresos", "id"),
    tabla<Filas["movimientos"][number]>("movimientos", "id"),
    tabla<Filas["pagos_fijos"][number]>("pagos_fijos", "dia"),
    tabla<Filas["pagos_mes"][number]>("pagos_mes", "id"),
  ]);
  // Si la tabla todavía no existe (falta correr 0007_tarjetas.sql), la app sigue andando sin tarjetas.
  const tarjetas = await tabla<FilaTarjeta>("tarjetas", "banco").catch(() => [] as FilaTarjeta[]);
  return { miembros, categorias, techos, ingresos, movimientos, pagos_fijos, pagos_mes, tarjetas };
}

const normalizar = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/**
 * Prepara un .json exportado de la app (modo demo) para `importar_datos`:
 * ids nuevos en uuid, miembros del archivo emparejados por nombre con los del hogar,
 * y cada techo guardado desde el mes más viejo con datos (vale para todos los meses).
 */
export function prepararImportacion(d: Datos, miembrosHogar: Miembro[], mesActual: Mes) {
  const ids = new Map<string, string>();
  const id = (viejo: string) => {
    if (!ids.has(viejo)) ids.set(viejo, crypto.randomUUID());
    return ids.get(viejo)!;
  };

  const miembro = new Map<string, string>();
  for (const m of d.miembros) {
    const delHogar = miembrosHogar.find((h) => normalizar(h.nombre) === normalizar(m.nombre));
    if (!delHogar) {
      throw new Error(`"${m.nombre}" no es del hogar. Los nombres tienen que coincidir: ${miembrosHogar.map((h) => h.nombre).join(" y ")}.`);
    }
    miembro.set(m.id, delHogar.id);
  }
  const quien = (viejo: string) => miembro.get(viejo)!;

  const meses = [...d.movimientos.map((m) => m.fecha.slice(0, 7) + "-01"), ...d.pagosMes.map((p) => p.mes), mesActual];
  const mesBase = meses.reduce((a, b) => (b < a ? b : a));

  return {
    categorias: d.categorias.map((c) => ({ id: id(c.id), nombre: c.nombre, orden: c.orden })),
    techos: d.categorias.filter((c) => c.techo).map((c) => ({ categoriaId: id(c.id), mes: mesBase, monto: c.techo })),
    ingresos: d.ingresos.map((i) => ({ ...i, id: id(i.id), miembroId: quien(i.miembroId) })),
    tarjetas: (d.tarjetas ?? []).map((t) => ({ ...t, id: id(t.id), miembroId: quien(t.miembroId) })),
    pagosFijos: d.pagosFijos.map((p) => ({ ...p, id: id(p.id), categoriaId: id(p.categoriaId), tarjetaId: p.tarjetaId ? id(p.tarjetaId) : null })),
    movimientos: d.movimientos.map((m) => ({
      ...m,
      id: id(m.id),
      categoriaId: id(m.categoriaId),
      pagoPor: quien(m.pagoPor),
    })),
    pagosMes: d.pagosMes.map((p) => ({
      ...p,
      id: id(p.id),
      pagoFijoId: id(p.pagoFijoId),
      movimientoId: p.movimientoId && d.movimientos.some((m) => m.id === p.movimientoId) ? id(p.movimientoId) : null,
    })),
  };
}
