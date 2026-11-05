"use client";

// Cargar gasto en 3 toques: monto → categoría → detalle.
// Fecha = hoy y "pagó" = quien está usando la app, editables en el paso 3.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icono, IconoCategoria, ICONOS } from "@/components/Iconos";
import { Boton } from "@/components/ui";
import { hoy, pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

type Paso = "monto" | "categoria" | "detalle";
const ORDEN: Paso[] = ["monto", "categoria", "detalle"];

export default function Cargar() {
  const router = useRouter();
  const { datos, usuarioId, agregarMovimiento } = useBilletera();
  const [paso, setPaso] = useState<Paso>("monto");
  const [montoTexto, setMontoTexto] = useState("");
  const [entraPlata, setEntraPlata] = useState(false);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [pagoPor, setPagoPor] = useState(usuarioId);

  const monto = Number(montoTexto.replace(/\./g, "").replace(",", ".")) || 0;
  const categoria = datos.categorias.find((c) => c.id === categoriaId);
  const categorias = [...datos.categorias].sort((a, b) => a.orden - b.orden);
  const titulos: Record<Paso, string> = {
    monto: entraPlata ? "¿Cuánta plata entró?" : "¿Cuánto gastaste?",
    categoria: "¿En qué?",
    detalle: "Revisá y guardá",
  };

  function guardar() {
    if (!categoriaId || monto <= 0) return;
    agregarMovimiento({ fecha, monto: entraPlata ? -monto : monto, categoriaId, detalle: detalle.trim(), pagoPor });
    router.push("/");
  }

  function atras() {
    if (paso === "monto") router.back();
    else setPaso(paso === "detalle" ? "categoria" : "monto");
  }

  return (
    <main className="fixed inset-0 z-30 mx-auto flex max-w-md flex-col overflow-y-auto bg-tarjeta px-5 pt-[env(safe-area-inset-top)]">
      <div className="mt-2 flex h-14 items-center justify-between">
        <button onClick={atras} className="grid size-10 place-items-center rounded-full active:bg-relleno" aria-label="Atrás">
          <Icono trazo={ICONOS.atras} className="size-[22px]" />
        </button>
        <span className="text-[13px] text-tenue" aria-live="polite">
          Paso {ORDEN.indexOf(paso) + 1} de 3
        </span>
        <button onClick={() => router.push("/")} className="grid size-10 place-items-center rounded-full active:bg-relleno" aria-label="Cancelar">
          <Icono trazo={ICONOS.cerrar} className="size-[22px]" />
        </button>
      </div>

      <h1 className="mt-4 text-[24px] font-semibold tracking-tight">{titulos[paso]}</h1>
      {paso !== "monto" && (
        <p className="mt-1 text-[15px] text-tenue tabular-nums">
          {entraPlata ? "Entran " : ""}
          {pesos(monto)}
          {paso === "detalle" && categoria ? ` en ${categoria.nombre}` : ""}
        </p>
      )}

      {paso === "monto" && (
        <form
          className="flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (monto > 0) setPaso("categoria");
          }}
        >
          <label className="mt-10 flex items-start text-[56px] font-semibold leading-none tracking-[-0.03em]">
            <span className="mr-1 mt-[0.16em] text-[28px] font-medium tracking-normal">$</span>
            <input
              autoFocus
              inputMode="decimal"
              value={montoTexto}
              onChange={(e) => setMontoTexto(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0"
              aria-label="Monto"
              className="w-full bg-transparent tabular-nums caret-texto outline-none placeholder:text-sutil"
            />
          </label>
          <label className="mt-8 flex items-center justify-between gap-4 border-t border-linea py-4">
            <span>
              <span className="block text-[15px] font-medium">Es plata que entra</span>
              <span className="mt-0.5 block text-[13px] text-tenue">Por ejemplo, un préstamo para cancelar deudas.</span>
            </span>
            <Interruptor activo={entraPlata} onCambio={setEntraPlata} />
          </label>
          <Boton type="submit" disabled={monto <= 0} className="mb-[max(env(safe-area-inset-bottom),1.25rem)] mt-auto">
            Seguir
          </Boton>
        </form>
      )}

      {paso === "categoria" && (
        <ul className="mt-6 grid grid-cols-4 gap-x-1 gap-y-5 pb-8">
          {categorias.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => {
                  setCategoriaId(c.id);
                  setPaso("detalle");
                }}
                aria-pressed={c.id === categoriaId}
                className="flex w-full flex-col items-center gap-2 rounded-xl py-1 text-center active:bg-relleno"
              >
                <IconoCategoria nombre={c.nombre} tamano="lg" />
                <span className="text-[12px] font-medium leading-[15px]">{c.nombre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {paso === "detalle" && (
        <form
          className="flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            guardar();
          }}
        >
          <div className="mt-6 divide-y divide-linea border-y border-linea">
            <label className="flex items-center justify-between gap-4 py-3.5">
              <span className="text-[15px] text-tenue">Detalle</span>
              <input
                autoFocus
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                placeholder="Opcional"
                className="min-w-0 flex-1 bg-transparent text-right text-[15px] font-medium outline-none placeholder:font-normal placeholder:text-sutil"
              />
            </label>
            <label className="flex items-center justify-between gap-4 py-3.5">
              <span className="text-[15px] text-tenue">Fecha</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value || hoy())} className="bg-transparent text-right text-[15px] font-medium outline-none" />
            </label>
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="text-[15px] text-tenue">Pagó</span>
              <div className="flex rounded-full bg-relleno p-0.5" role="radiogroup" aria-label="Pagó">
                {datos.miembros.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={pagoPor === m.id}
                    onClick={() => setPagoPor(m.id)}
                    className="rounded-full px-3.5 py-1.5 text-[14px] font-medium text-tenue aria-checked:bg-tarjeta aria-checked:text-texto aria-checked:shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                  >
                    {m.nombre}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Boton type="submit" className="mb-[max(env(safe-area-inset-bottom),1.25rem)] mt-auto">
            Guardar
          </Boton>
        </form>
      )}
    </main>
  );
}

function Interruptor({ activo, onCambio }: { activo: boolean; onCambio: (v: boolean) => void }) {
  return (
    <span className="relative shrink-0">
      <input type="checkbox" role="switch" checked={activo} onChange={(e) => onCambio(e.target.checked)} className="peer sr-only" />
      <span className="block h-[30px] w-[50px] rounded-full bg-linea transition peer-checked:bg-marca peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-texto" />
      <span className="absolute left-[3px] top-[3px] size-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition peer-checked:translate-x-5" />
    </span>
  );
}
