"use client";

// Barra compacta con el saldo que aparece arriba cuando la tarjeta grande sale de la vista.
// Así el saldo nunca se pierde mientras bajás por la actividad. Lleva el mes: al bajar, el chip
// del mes queda fuera de la vista y era fácil no darse cuenta de estar mirando otro mes.

import { useEffect, useRef, useState } from "react";
import { hoy, mesDe, nombreMes, pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

export function SaldoFijo({ monto, etiqueta, children }: { monto: number; etiqueta: string; children: React.ReactNode }) {
  const ancla = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { mes, setMes } = useBilletera();
  const otroMes = mes !== mesDe(hoy());

  useEffect(() => {
    // Aparece apenas el chip del mes deja de verse (antes esperaba a que saliera toda la tarjeta
    // y tardaba): así nunca hay un momento sin saber en qué mes estás. Si la pantalla no tiene
    // chip, se guía por la tarjeta.
    const fila = document.querySelector("[data-fila-mes]");
    const el = fila ?? ancla.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting && e.boundingClientRect.top < 0), {
      threshold: 0,
      // La barra ocupa los ~56 px de arriba: lo que queda detrás de ella ya no se ve.
      rootMargin: fila ? "-56px 0px 0px 0px" : "-72px 0px 0px 0px",
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <div
        aria-hidden={!visible}
        className={`fixed inset-x-0 top-0 z-30 mx-auto max-w-md border-b border-linea bg-fondo/90 px-5 pb-2.5 pt-[max(env(safe-area-inset-top),0.625rem)] backdrop-blur-md transition duration-200 ease-out motion-reduce:transition-none ${
          visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"
        }`}
      >
        <div className="flex items-end justify-between gap-3">
          <span className="min-w-0">
            <span className={`flex items-center gap-2 text-[13px] font-semibold capitalize ${otroMes ? "text-marca" : "text-tenue"}`}>
              {nombreMes(mes)}
              {otroMes && (
                <button onClick={() => setMes(mesDe(hoy()))} className="rounded-full bg-marca-suave px-2 py-0.5 text-[12px] font-semibold normal-case text-marca">
                  Volver a hoy
                </button>
              )}
            </span>
            <span className="block truncate text-[13px] text-tenue">{etiqueta}</span>
          </span>
          <span className={`text-[20px] font-semibold tracking-[-0.02em] tabular-nums ${Math.round(monto) < 0 ? "text-pasaste" : ""}`}>{pesos(monto, { ceroComoGuion: false })}</span>
        </div>
      </div>
      <div ref={ancla}>{children}</div>
    </>
  );
}
