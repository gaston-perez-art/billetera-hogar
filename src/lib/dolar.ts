"use client";

// Dólar blue del día, para estimar en pesos las cuotas de un préstamo en dólares.
// Lo trae de dolarapi.com (pública, sin clave). Es un valor de referencia: al pagar se usa
// el dólar real de la casa de cambio, que se carga a mano y queda guardado en el pago.
// Si no se puede traer (sin conexión, la API caída), la app sigue: se carga a mano.

import { useEffect, useState } from "react";

export const FUENTE_DOLAR = "https://dolarapi.com/v1/dolares/blue";
const CLAVE = "billetera-hogar:dolar-blue";
/** Cada cuánto se vuelve a pedir (el blue se mueve durante el día). */
const VIGENCIA_MS = 30 * 60 * 1000;

export interface DolarBlue {
  /** Lo que cobra la casa de cambio por cada dólar que comprás. */
  venta: number;
  compra: number;
  /** Cuándo lo actualizó la fuente (ISO). */
  fecha: string;
}

/** Lee la respuesta de dolarapi.com; null si no tiene la forma esperada. */
export function leerDolarBlue(json: unknown): DolarBlue | null {
  if (!json || typeof json !== "object") return null;
  const { venta, compra, fechaActualizacion } = json as Record<string, unknown>;
  if (typeof venta !== "number" || !(venta > 0)) return null;
  return {
    venta,
    compra: typeof compra === "number" ? compra : venta,
    fecha: typeof fechaActualizacion === "string" ? fechaActualizacion : new Date().toISOString(),
  };
}

let enCurso: Promise<DolarBlue | null> | null = null;

function guardado(): { valor: DolarBlue; pedido: number } | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

async function pedir(): Promise<DolarBlue | null> {
  try {
    const r = await fetch(FUENTE_DOLAR, { cache: "no-store" });
    if (!r.ok) return null;
    const valor = leerDolarBlue(await r.json());
    if (valor) {
      try {
        localStorage.setItem(CLAVE, JSON.stringify({ valor, pedido: Date.now() }));
      } catch {
        // Sin storage: se usa igual.
      }
    }
    return valor;
  } catch {
    return null;
  }
}

/** El blue del día (venta). null mientras carga o si no se pudo traer. */
export function useDolarBlue(): DolarBlue | null {
  const [dolar, setDolar] = useState<DolarBlue | null>(null);
  useEffect(() => {
    const previo = guardado();
    if (previo) setDolar(previo.valor);
    if (previo && Date.now() - previo.pedido < VIGENCIA_MS) return;
    enCurso ??= pedir().finally(() => (enCurso = null));
    let vivo = true;
    enCurso.then((v) => vivo && v && setDolar(v));
    return () => {
      vivo = false;
    };
  }, []);
  return dolar;
}
