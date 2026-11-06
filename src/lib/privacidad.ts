"use client";

// El ojito: ocultar los montos en este celular. Se recuerda en el navegador (es una
// preferencia de cada uno, no un dato del hogar).

import { useCallback, useEffect, useState } from "react";
import { fijarMontosOcultos } from "./formato";

const CLAVE = "billetera-hogar:montos-ocultos";

export function useMontosOcultos() {
  const [ocultos, setOcultos] = useState(false);
  useEffect(() => {
    try {
      setOcultos(localStorage.getItem(CLAVE) === "1");
    } catch {
      // Sin storage: arranca visible.
    }
  }, []);
  // Se fija antes de que se dibujen las pantallas de este render.
  fijarMontosOcultos(ocultos);
  const alternar = useCallback(() => {
    setOcultos((o) => {
      try {
        localStorage.setItem(CLAVE, o ? "0" : "1");
      } catch {
        // Sin storage: vale hasta cerrar la app.
      }
      return !o;
    });
  }, []);
  return { ocultos, alternar };
}
