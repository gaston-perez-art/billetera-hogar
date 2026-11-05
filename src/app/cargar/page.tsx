"use client";

// Cargar gasto en 3 toques: monto → categoría → detalle.
// Fecha = hoy y "pagó" = quien está usando la app, editables sin salir del paso 3.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icono, IconoCategoria, ICONOS } from "@/components/Iconos";
import { hoy, pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

type Paso = "monto" | "categoria" | "detalle";

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

  function guardar() {
    if (!categoriaId || monto <= 0) return;
    agregarMovimiento({
      fecha,
      monto: entraPlata ? -monto : monto,
      categoriaId,
      detalle: detalle.trim(),
      pagoPor,
    });
    router.push("/");
  }

  function atras() {
    if (paso === "monto") router.back();
    else setPaso(paso === "detalle" ? "categoria" : "monto");
  }

  return (
    <main className="fixed inset-0 z-30 mx-auto flex max-w-md flex-col overflow-y-auto bg-tarjeta px-5 pt-[max(env(safe-area-inset-top),1.25rem)]">
      <div className="flex items-center justify-between">
        <button onClick={atras} className="grid size-10 place-items-center rounded-full bg-fondo" aria-label="Atrás">
          <Icono trazo={ICONOS.atras} className="size-5" />
        </button>
        <Pasos actual={paso} />
        <button onClick={() => router.push("/")} className="grid size-10 place-items-center rounded-full bg-fondo" aria-label="Cancelar">
          <Icono trazo={ICONOS.cerrar} className="size-5" />
        </button>
      </div>

      {paso === "monto" && (
        <form
          className="flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (monto > 0) setPaso("categoria");
          }}
        >
          <p className="mt-14 text-center text-lg font-semibold">{entraPlata ? "¿Cuánta plata entró?" : "¿Cuánto gastaste?"}</p>
          <label className="mt-4 flex items-start justify-center gap-1 text-[56px] font-bold leading-none tracking-[-0.035em]">
            <span className="mt-2 text-[26px] font-semibold tracking-normal text-tenue">$</span>
            <input
              autoFocus
              inputMode="decimal"
              value={montoTexto}
              onChange={(e) => setMontoTexto(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0"
              aria-label="Monto"
              style={{ width: `${Math.max(montoTexto.length, 1) + 0.6}ch` }}
              className="max-w-[11ch] bg-transparent text-left tabular-nums caret-queda outline-none placeholder:text-linea"
            />
          </label>
          <div className="mx-auto mt-8 flex rounded-full bg-fondo p-1 text-sm font-semibold" role="radiogroup" aria-label="Tipo de movimiento">
            {[
              [false, "Gasto"],
              [true, "Plata que entra"],
            ].map(([valor, texto]) => (
              <button
                key={String(valor)}
                type="button"
                role="radio"
                aria-checked={entraPlata === valor}
                onClick={() => setEntraPlata(valor as boolean)}
                className="rounded-full px-4 py-2 text-tenue aria-checked:bg-tarjeta aria-checked:text-texto aria-checked:shadow-sm"
              >
                {texto as string}
              </button>
            ))}
          </div>
          {entraPlata && <p className="mt-3 text-center text-sm text-tenue">Por ejemplo, un préstamo usado para cancelar deudas.</p>}
          <BotonPrincipal disabled={monto <= 0}>Seguir</BotonPrincipal>
        </form>
      )}

      {paso === "categoria" && (
        <div className="flex-1">
          <p className="mt-8 text-center text-lg font-semibold">
            {pesos(monto)} <span className="font-normal text-tenue">¿en qué?</span>
          </p>
          <div className="mt-7 grid grid-cols-3 gap-x-2 gap-y-5 pb-8">
            {categorias.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCategoriaId(c.id);
                  setPaso("detalle");
                }}
                aria-pressed={c.id === categoriaId}
                className="flex flex-col items-center gap-2 rounded-2xl px-1 py-1 text-center transition active:scale-95"
              >
                <span className={`rounded-full ${c.id === categoriaId ? "ring-2 ring-bosque ring-offset-2" : ""}`}>
                  <IconoCategoria nombre={c.nombre} tamano="lg" />
                </span>
                <span className="text-[13px] font-semibold leading-4">{c.nombre}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {paso === "detalle" && (
        <form
          className="flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            guardar();
          }}
        >
          <div className="mt-8 flex flex-col items-center text-center">
            {categoria && <IconoCategoria nombre={categoria.nombre} tamano="lg" />}
            <p className="mt-3 text-[40px] font-bold leading-none tracking-[-0.035em] tabular-nums">{pesos(monto)}</p>
            <p className="mt-1.5 text-tenue">en {categoria?.nombre}</p>
          </div>
          <input
            autoFocus
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Detalle (opcional)"
            aria-label="Detalle"
            className="mt-7 rounded-2xl bg-fondo px-4 py-4 font-semibold outline-none placeholder:font-normal placeholder:text-tenue focus:ring-2 focus:ring-bosque"
          />
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <label className="rounded-2xl bg-fondo px-4 py-3">
              <span className="block text-xs text-tenue">Fecha</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value || hoy())} className="w-full bg-transparent font-semibold outline-none" />
            </label>
            <label className="rounded-2xl bg-fondo px-4 py-3">
              <span className="block text-xs text-tenue">Pagó</span>
              <select value={pagoPor} onChange={(e) => setPagoPor(e.target.value)} className="w-full bg-transparent font-semibold outline-none">
                {datos.miembros.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </label>
          </div>
          <BotonPrincipal>Guardar gasto</BotonPrincipal>
        </form>
      )}
    </main>
  );
}

function Pasos({ actual }: { actual: Paso }) {
  const orden: Paso[] = ["monto", "categoria", "detalle"];
  return (
    <div className="flex gap-1.5" aria-label={`Paso ${orden.indexOf(actual) + 1} de 3`}>
      {orden.map((p, i) => (
        <span key={p} className={`h-1.5 rounded-full transition-all ${i === orden.indexOf(actual) ? "w-8 bg-bosque" : i < orden.indexOf(actual) ? "w-4 bg-bosque" : "w-4 bg-linea"}`} />
      ))}
    </div>
  );
}

function BotonPrincipal({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-auto mb-[max(env(safe-area-inset-bottom),1.5rem)] w-full rounded-full bg-bosque py-4 text-[17px] font-bold text-white transition active:scale-[0.99] disabled:bg-linea disabled:text-tenue"
    >
      {children}
    </button>
  );
}
