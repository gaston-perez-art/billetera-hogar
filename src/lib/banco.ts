// Comparar con el banco (Inicio): detecta gastos que no se cargaron.
// No se compara el saldo del banco con "Tienen hoy" (el banco tiene plata de meses anteriores),
// sino cuánto cambió cada uno desde la última vez. Si en el banco bajó más de lo que la app
// sabe, falta cargar gastos; si subió más, entró plata sin cargar.

import { ingresosDelMes } from "./calculos";
import { CATEGORIA_AHORRO } from "./calculos";
import { mesDe, sumarMeses } from "./formato";
import type { Datos, Fecha } from "./tipos";

export interface PuntoBanco {
  fecha: Fecha;
  /** Lo que tenían en sus cuentas menos lo que debían de tarjetas, entre los dos. */
  banco: number;
  /** El acumulado de la app ese día (`acumuladoApp`). */
  app: number;
}

/**
 * Lo que la app cree que entró menos lo que salió, desde el primer mes con datos hasta `fecha`
 * inclusive. Cada sueldo cuenta desde el primer día de su mes (así lo cuenta la app). Lo apartado
 * en Ahorro no cuenta: sigue en sus cuentas.
 */
export function acumuladoApp(d: Datos, fecha: Fecha): number {
  const ahorro = d.categorias.find((c) => c.nombre === CATEGORIA_AHORRO)?.id;
  const movs = d.movimientos.filter((m) => m.fecha <= fecha && m.categoriaId !== ahorro);
  if (movs.length === 0) return ingresosDelMes(d, mesDe(fecha));
  const primero = mesDe(movs.reduce((a, m) => (m.fecha < a ? m.fecha : a), fecha));
  let entra = 0;
  for (let mes = primero; mes <= mesDe(fecha); mes = sumarMeses(mes, 1)) entra += ingresosDelMes(d, mes);
  return entra - movs.reduce((a, m) => a + m.monto, 0);
}

export interface Comparacion {
  /** banco − app desde el punto anterior. Negativo = faltan cargar gastos; positivo = entró plata sin cargar. */
  diferencia: number;
  /** Si es tan chica que da igual (menos de $1.000 o del 1% de lo que se movió). */
  coincide: boolean;
}

export function comparar(anterior: PuntoBanco, banco: number, appAhora: number): Comparacion {
  const cambioBanco = banco - anterior.banco;
  const cambioApp = appAhora - anterior.app;
  const diferencia = Math.round((cambioBanco - cambioApp) * 100) / 100;
  const tolerancia = Math.max(1000, Math.abs(cambioApp) * 0.01);
  return { diferencia, coincide: Math.abs(diferencia) < tolerancia };
}

const CLAVE = "billetera-hogar:banco";

export function leerPunto(): PuntoBanco | null {
  try {
    const v = localStorage.getItem(CLAVE);
    return v ? (JSON.parse(v) as PuntoBanco) : null;
  } catch {
    return null;
  }
}

export function guardarPunto(p: PuntoBanco) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p));
  } catch {
    // Sin storage: la próxima vez arranca de cero.
  }
}
