"use client";

// Respuesta al tocar, para toda la app:
// - Vibración corta al tocar botones y enlaces, donde el navegador lo permite.
//   Android (Chrome) usa navigator.vibrate. Safari en iPhone no tiene esa API; desde iOS 18
//   un interruptor nativo (<input switch>) da un toque del motor háptico, y se usa eso.
// - El efecto visual de presión vive en globals.css (clases .presionable y .fila).

import { useEffect } from "react";

let interruptor: HTMLLabelElement | null = null;

export function vibrar() {
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(8);
      return;
    }
    if (!interruptor) {
      interruptor = document.createElement("label");
      interruptor.setAttribute("aria-hidden", "true");
      interruptor.style.cssText = "position:fixed;left:-100px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.setAttribute("switch", "");
      input.tabIndex = -1;
      interruptor.appendChild(input);
      document.body.appendChild(interruptor);
    }
    interruptor.click();
  } catch {
    // Sin vibración: no es un error, solo no hay hardware o API.
  }
}

/**
 * Dispara la acción apenas se levanta el dedo, sin esperar el "click".
 * En iPhone Safari a veces no dispara el click (por ejemplo, si la pantalla todavía se desliza
 * por el impulso del scroll): había que tocar de nuevo o no respondía. Con mouse o teclado
 * sigue andando el click normal.
 */
export function alTocar(accion: () => void) {
  let inicio: { x: number; y: number } | null = null;
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      inicio = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const t = e.changedTouches[0];
      const desde = inicio;
      inicio = null;
      // Si el dedo se movió, era un scroll o un arrastre: no es un toque.
      if (!desde || Math.hypot(t.clientX - desde.x, t.clientY - desde.y) > 10) return;
      e.preventDefault(); // evita el click que vendría después (dispararía dos veces)
      vibrar();
      accion();
    },
    onClick: accion,
  };
}

export function Tactil() {
  useEffect(() => {
    const alTocar = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest("button, a, [role=radio], [role=switch], label:has(input[type=file], input[type=checkbox])");
      if (!el || el === interruptor || (el as HTMLButtonElement).disabled) return;
      vibrar();
    };
    document.addEventListener("click", alTocar, true);
    return () => document.removeEventListener("click", alTocar, true);
  }, []);
  return null;
}
