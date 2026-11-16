"use client";

// Si la app estuvo en segundo plano un rato, vuelve al mes en curso. Así no se abre en otro
// mes que quedó elegido horas antes (pasó: se veía diciembre creyendo que era noviembre).

import { useEffect, useRef } from "react";
import { hoy, mesDe } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

const PAUSA = 15 * 60 * 1000;

export function VolverAlMes() {
  const { setMes } = useBilletera();
  // En una ref: si la función cambia (Realtime vuelve a dibujar), no se pierde cuándo se ocultó.
  const fijar = useRef(setMes);
  useEffect(() => {
    fijar.current = setMes;
  }, [setMes]);
  useEffect(() => {
    let oculta = 0;
    const alCambiar = () => {
      if (document.visibilityState === "hidden") oculta = Date.now();
      else if (oculta && Date.now() - oculta >= PAUSA) fijar.current(mesDe(hoy()));
    };
    document.addEventListener("visibilitychange", alCambiar);
    return () => document.removeEventListener("visibilitychange", alCambiar);
  }, []);
  return null;
}
