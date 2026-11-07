"use client";

// Vista de la app: "Los dos" (todo el hogar) o "Solo yo" (lo que cargó quien usa la app).
// Es una preferencia de cada celular, como el ojito. Vale para Inicio y Categorías;
// Pagos y Reparto se ven siempre igual porque son de los dos.
// No hay vista "solo el otro": no se mira lo ajeno.

import { useCallback, useEffect, useState } from "react";

export type Vista = "pareja" | "mio";

const CLAVE = "billetera-hogar:vista";
const EVENTO = "billetera-hogar:vista-cambio";

function leer(): Vista {
  try {
    return localStorage.getItem(CLAVE) === "mio" ? "mio" : "pareja";
  } catch {
    return "pareja";
  }
}

export function useVista(): [Vista, (v: Vista) => void] {
  const [vista, setVistaState] = useState<Vista>("pareja");
  useEffect(() => {
    setVistaState(leer());
    const actualizar = () => setVistaState(leer());
    window.addEventListener(EVENTO, actualizar);
    return () => window.removeEventListener(EVENTO, actualizar);
  }, []);
  const setVista = useCallback((v: Vista) => {
    try {
      localStorage.setItem(CLAVE, v);
    } catch {
      // Sin storage: vale mientras la app esté abierta.
    }
    setVistaState(v);
    window.dispatchEvent(new Event(EVENTO));
  }, []);
  return [vista, setVista];
}
