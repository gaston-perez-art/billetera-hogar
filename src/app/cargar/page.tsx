"use client";

// Cargar gasto en 3 toques: monto → categoría → detalle.
// Fecha = hoy y "pagó" = quien está usando la app, editables sin salir del paso 3.

import { useRouter } from "next/navigation";
import { useState } from "react";
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
    <main className="flex min-h-dvh flex-col px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      <div className="flex items-center justify-between">
        <button onClick={atras} className="grid size-9 place-items-center rounded-full hover:bg-linea" aria-label="Atrás">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <Pasos actual={paso} />
        <button onClick={() => router.push("/")} className="text-sm text-tenue">Cancelar</button>
      </div>

      {paso === "monto" && (
        <form
          className="flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (monto > 0) setPaso("categoria");
          }}
        >
          <p className="mt-10 text-center text-tenue">{entraPlata ? "¿Cuánta plata entró?" : "¿Cuánto gastaste?"}</p>
          <label className="mt-3 flex items-baseline justify-center gap-1 text-5xl font-semibold tracking-tight">
            <span className="text-tenue">$</span>
            <input
              autoFocus
              inputMode="decimal"
              value={montoTexto}
              onChange={(e) => setMontoTexto(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0"
              aria-label="Monto"
              className="w-full max-w-[8ch] bg-transparent text-center tabular-nums outline-none placeholder:text-linea"
            />
          </label>
          <label className="mx-auto mt-6 flex items-center gap-2 text-sm text-tenue">
            <input type="checkbox" checked={entraPlata} onChange={(e) => setEntraPlata(e.target.checked)} className="accent-marca" />
            Es plata que entra (ej.: préstamo para cancelar deudas)
          </label>
          <BotonPrincipal disabled={monto <= 0}>Seguir</BotonPrincipal>
        </form>
      )}

      {paso === "categoria" && (
        <div className="flex-1">
          <p className="mt-6 text-center text-tenue">
            <span className="font-semibold text-texto">{pesos(monto)}</span> ¿en qué?
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {categorias.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCategoriaId(c.id);
                  setPaso("detalle");
                }}
                className={`rounded-2xl border px-3 py-4 text-left font-medium transition active:scale-[0.98] ${
                  c.id === categoriaId ? "border-marca bg-marca-suave text-marca" : "border-linea bg-tarjeta"
                }`}
              >
                {c.nombre}
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
          <p className="mt-6 text-center text-tenue">
            <span className="font-semibold text-texto">{pesos(monto)}</span> en {categoria?.nombre}
          </p>
          <input
            autoFocus
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Detalle (opcional)"
            aria-label="Detalle"
            className="mt-5 rounded-2xl border border-linea bg-tarjeta px-4 py-3.5 outline-none focus:border-marca"
          />
          {categoria?.nombre === "Chicos" && (
            <p className="mt-2 px-1 text-xs text-tenue">Empezá con &quot;Santino&quot; para que sume a sus gastos del mes.</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
            <label className="rounded-2xl bg-tarjeta px-4 py-2.5">
              <span className="block text-xs text-tenue">Fecha</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value || hoy())} className="w-full bg-transparent outline-none" />
            </label>
            <label className="rounded-2xl bg-tarjeta px-4 py-2.5">
              <span className="block text-xs text-tenue">Pagó</span>
              <select value={pagoPor} onChange={(e) => setPagoPor(e.target.value)} className="w-full bg-transparent outline-none">
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
        <span key={p} className={`h-1.5 w-6 rounded-full ${i <= orden.indexOf(actual) ? "bg-marca" : "bg-linea"}`} />
      ))}
    </div>
  );
}

function BotonPrincipal({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-auto mb-[max(env(safe-area-inset-bottom),1.5rem)] w-full rounded-2xl bg-marca py-4 font-semibold text-white transition active:scale-[0.99] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
