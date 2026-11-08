"use client";

// Vista de la app: "La pareja" (todo el hogar) o una persona (lo que cargó esa persona).
// Es una preferencia de cada celular, como el ojito. Vale para Inicio y Categorías;
// Pagos y Reparto se ven siempre igual porque son de los dos.
//
// Un solo valor en memoria para toda la app (useSyncExternalStore): el selector y la pantalla
// leen lo mismo. localStorage solo lo recuerda para la próxima vez; si falla, el cambio vale
// igual mientras la app esté abierta (antes se releía el storage y el cambio se deshacía).

import { useSyncExternalStore } from "react";
import { useBilletera } from "@/lib/store";

/** "pareja", el id de un miembro, o "mio" (valor viejo: quien usa la app). */
export type Vista = string;

const CLAVE = "billetera-hogar:vista";

let actual: Vista | null = null;
const oyentes = new Set<() => void>();

function leer(): Vista {
  if (actual === null) {
    try {
      actual = localStorage.getItem(CLAVE) || "pareja";
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
  const vista = useSyncExternalStore(suscribir, leer, () => "pareja");
  return [vista, fijarVista];
}

/** A qué vista corresponde un valor guardado: null = la pareja, o el id de un miembro que existe. */
export function personaDeVista(vista: Vista, usuarioId: string, miembros: { id: string }[]): string | null {
  const id = vista === "mio" ? usuarioId : vista;
  return miembros.some((m) => m.id === id) ? id : null;
}

/**
 * La persona elegida en el selector (null = la pareja), con lo necesario para hablarle:
 * `vos` si es quien usa la app ("Gastaste"), si no se nombra ("Gastó Jime").
 */
export function usePersonaVista(): { id: string; nombre: string; vos: boolean } | null {
  const [vista] = useVista();
  const { datos, usuarioId } = useBilletera();
  const id = personaDeVista(vista, usuarioId, datos.miembros);
  const m = id ? datos.miembros.find((x) => x.id === id) : undefined;
  return m ? { id: m.id, nombre: m.nombre, vos: m.id === usuarioId } : null;
}
