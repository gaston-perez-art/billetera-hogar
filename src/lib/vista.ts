"use client";

// Vista de la app: "Los dos" (todo el hogar) o "Solo yo" (lo que cargó quien usa la app).
// Es una preferencia de cada celular, como el ojito. Vale para Inicio y Categorías;
// Pagos y Reparto se ven siempre igual porque son de los dos.
// No hay vista "solo el otro": no se mira lo ajeno.
//
// Un solo valor en memoria para toda la app (useSyncExternalStore): el selector y la pantalla
// leen lo mismo. localStorage solo lo recuerda para la próxima vez; si falla, el cambio vale
// igual mientras la app esté abierta (antes se releía el storage y el cambio se deshacía).

import { useSyncExternalStore } from "react";

export type Vista = "pareja" | "mio";

const CLAVE = "billetera-hogar:vista";

let actual: Vista | null = null;
const oyentes = new Set<() => void>();

function leer(): Vista {
  if (actual === null) {
    try {
      actual = localStorage.getItem(CLAVE) === "mio" ? "mio" : "pareja";
    } catch {
      actual = "pareja";
    }
  }
  return actual;
}

export function fijarVista(v: Vista) {
  actual = v;
  try {
    localStorage.setItem(CLAVE, v);
  } catch {
    // Sin storage: vale mientras la app esté abierta.
  }
  oyentes.forEach((f) => f());
}

function suscribir(f: () => void) {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

export function useVista(): [Vista, (v: Vista) => void] {
  const vista = useSyncExternalStore(suscribir, leer, () => "pareja" as Vista);
  return [vista, fijarVista];
}
