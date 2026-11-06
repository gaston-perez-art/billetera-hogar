"use client";

// Barra compacta con el saldo que aparece arriba cuando la tarjeta grande sale de la vista.
// Así el saldo nunca se pierde mientras bajás por la actividad.

import { useEffect, useRef, useState } from "react";
import { pesos } from "@/lib/formato";

export function SaldoFijo({ monto, etiqueta, children }: { monto: number; etiqueta: string; children: React.ReactNode }) {
  const ancla = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ancla.current;
    if (!el) return;
    // Se muestra cuando la tarjeta ya quedó detrás de donde aparece la barra (los ~72px de arriba),
    // así no queda un pedazo de tarjeta a la vista sin el número.
    const obs = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting && e.boundingClientRect.top < 0), {
      threshold: 0,
      rootMargin: "-72px 0px 0px 0px",
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <div
        aria-hidden={!visible}
        className={`fixed inset-x-0 top-0 z-30 mx-auto max-w-md border-b border-linea bg-fondo/90 px-5 pb-2.5 pt-[max(env(safe-area-inset-top),0.625rem)] backdrop-blur-md transition duration-300 ease-out motion-reduce:transition-none ${
          visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"
        }`}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] text-tenue">{etiqueta}</span>
          <span className={`text-[20px] font-semibold tracking-[-0.02em] tabular-nums ${Math.round(monto) < 0 ? "text-pasaste" : ""}`}>{pesos(monto, { ceroComoGuion: false })}</span>
        </div>
      </div>
      <div ref={ancla}>{children}</div>
    </>
  );
}
