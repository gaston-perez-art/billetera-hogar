"use client";

// Cargar gasto en 3 toques: monto → categoría → detalle.
// Fecha = hoy y "pagó" = quien está usando la app, editables en el paso 3.
// Los pasos deslizan de lado; volver atrás desliza al revés.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icono, IconoCategoria, ICONOS } from "@/components/Iconos";
import { Boton, CampoMonto, Hoja, Interruptor, MontoGrande, TarjetaLista } from "@/components/ui";
import { hoy, pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

type Paso = "monto" | "categoria" | "detalle";
const ORDEN: Paso[] = ["monto", "categoria", "detalle"];

export default function Cargar() {
  const router = useRouter();
  const { datos, usuarioId, agregarMovimiento, agregarCategoria } = useBilletera();
  const [paso, setPasoState] = useState<Paso>("monto");
  const [direccion, setDireccion] = useState<"adelante" | "atras">("adelante");
  const [monto, setMonto] = useState(0);
  const [creando, setCreando] = useState(false);
  const [nombreNueva, setNombreNueva] = useState("");
  const contenedor = useRef<HTMLElement>(null);
  const [entraPlata, setEntraPlata] = useState(false);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [pagoPor, setPagoPor] = useState(usuarioId);

  function setPaso(nuevo: Paso) {
    setDireccion(ORDEN.indexOf(nuevo) > ORDEN.indexOf(paso) ? "adelante" : "atras");
    setPasoState(nuevo);
  }
  // Cada paso arranca arriba: si en categorías bajaste, el paso 3 no queda corrido.
  useEffect(() => {
    contenedor.current?.scrollTo({ top: 0 });
  }, [paso]);

  function crearCategoria(e: React.FormEvent) {
    e.preventDefault();
    const nombre = nombreNueva.trim();
    if (!nombre) return;
    const existente = datos.categorias.find((c) => c.nombre.toLowerCase() === nombre.toLowerCase());
    setCategoriaId(existente?.id ?? agregarCategoria(nombre));
    setCreando(false);
    setNombreNueva("");
    setPaso("detalle");
  }
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
    <main ref={contenedor} className="fixed inset-0 z-30 mx-auto flex max-w-md flex-col overflow-y-auto overflow-x-hidden bg-fondo px-5 pt-[env(safe-area-inset-top)]">
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

      <div key={paso} className={`flex flex-1 flex-col ${direccion === "adelante" ? "paso-adelante" : "paso-atras"}`}>
      <h1 className="mt-4 text-[24px] font-semibold tracking-tight">{titulos[paso]}</h1>
      {paso === "categoria" && (
        <button type="button" onClick={() => setPaso("monto")} className="mt-1 flex items-center gap-1.5 text-[15px] text-tenue tabular-nums">
          {entraPlata ? "Entran " : ""}
          {pesos(monto)}
          <Icono trazo={ICONOS.lapiz} className="size-4 text-sutil" />
        </button>
      )}

      {paso === "monto" && (
        <form
          className="flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (monto > 0) setPaso("categoria");
          }}
        >
          <div className="mt-12">
            <CampoMonto valor={monto} onCambio={setMonto} autoFocus entra={entraPlata} />
          </div>
          <label className="mt-10 flex items-center justify-between gap-4 rounded-3xl superficie px-4 py-3.5 shadow-tarjeta ring-1 ring-linea">
            <span>
              <span className="block text-[15px] font-medium">Es plata que entra</span>
              <span className="mt-0.5 block text-[13px] text-tenue">Por ejemplo, un préstamo para cancelar deudas.</span>
            </span>
            <Interruptor activo={entraPlata} onCambio={setEntraPlata} />
          </label>
          <Boton type="submit" disabled={monto <= 0} className="mb-[max(env(safe-area-inset-bottom),1.25rem)] mt-auto">
            Continuar
          </Boton>
        </form>
      )}

      {paso === "categoria" && (
        <ul className="mt-6 grid grid-cols-4 gap-x-1 gap-y-5 pb-[max(env(safe-area-inset-bottom),2rem)]">
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
          <li>
            <button onClick={() => setCreando(true)} className="flex w-full flex-col items-center gap-2 rounded-xl py-1 text-center active:bg-relleno">
              <span className="grid size-14 place-items-center rounded-full border-[1.5px] border-dashed border-sutil text-marca">
                <Icono trazo={ICONOS.mas} className="size-6" />
              </span>
              <span className="text-[12px] font-semibold leading-[15px] text-marca">Nueva</span>
            </button>
          </li>
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
          {/* Resumen de lo cargado: el monto y la categoría se tocan para cambiarlos. */}
          <div className="mt-5 rounded-3xl superficie px-5 pb-4 pt-5 text-center shadow-tarjeta ring-1 ring-linea">
            <button type="button" onClick={() => setPaso("monto")} aria-label="Cambiar el monto" className="inline-flex items-center gap-2">
              <MontoGrande monto={monto} className={`text-[40px] ${entraPlata ? "text-queda" : ""}`} />
              <Icono trazo={ICONOS.lapiz} className="size-[18px] text-sutil" />
            </button>
            {categoria && (
              <button
                type="button"
                onClick={() => setPaso("categoria")}
                aria-label="Cambiar la categoría"
                className="mx-auto mt-3 flex items-center gap-2 rounded-full bg-relleno py-1 pl-1 pr-3"
              >
                <IconoCategoria nombre={categoria.nombre} entra={entraPlata} />
                <span className="text-[15px] font-medium">{entraPlata ? `Entra en ${categoria.nombre}` : categoria.nombre}</span>
                <Icono trazo={ICONOS.lapiz} className="size-4 text-sutil" />
              </button>
            )}
          </div>

          <TarjetaLista className="!mx-0 mt-4 divide-y divide-linea !py-0">
            <label className="flex min-h-14 items-center gap-4 px-4">
              <span className="shrink-0 text-[15px] text-tenue">Detalle</span>
              <input
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                placeholder={entraPlata ? "Por ejemplo, préstamo" : "Opcional"}
                maxLength={60}
                enterKeyHint="done"
                className="min-w-0 flex-1 truncate bg-transparent text-right font-medium outline-none placeholder:font-normal placeholder:text-sutil"
              />
            </label>
            <label className="flex min-h-14 items-center justify-between gap-4 px-4">
              <span className="text-[15px] text-tenue">Fecha</span>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value || hoy())}
                className="campo-fecha min-w-0 bg-transparent text-right font-medium outline-none"
              />
            </label>
            <div className="flex min-h-14 items-center justify-between gap-4 px-4">
              <span className="text-[15px] text-tenue">{entraPlata ? "La recibió" : "Pagó"}</span>
              <div className="flex rounded-full bg-relleno p-0.5" role="radiogroup" aria-label={entraPlata ? "La recibió" : "Pagó"}>
                {datos.miembros.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={pagoPor === m.id}
                    onClick={() => setPagoPor(m.id)}
                    className="rounded-full px-3.5 py-1.5 text-[14px] font-medium text-tenue aria-checked:bg-marca aria-checked:text-sobre-marca"
                  >
                    {m.nombre}
                  </button>
                ))}
              </div>
            </div>
          </TarjetaLista>
          <Boton type="submit" className="mb-[max(env(safe-area-inset-bottom),1.25rem)] mt-auto">
            Guardar
          </Boton>
        </form>
      )}
      </div>

      <Hoja abierta={creando} alCerrar={() => setCreando(false)} titulo="Nueva categoría" mostrarTitulo>
        <form onSubmit={crearCategoria}>
          <p className="text-[15px] text-tenue">La van a ver los dos. Le podés poner un techo después, en Ajustes.</p>
          <input
            autoFocus
            value={nombreNueva}
            onChange={(e) => setNombreNueva(e.target.value)}
            placeholder="Por ejemplo, Mascotas"
            aria-label="Nombre de la categoría"
            maxLength={30}
            className="mt-4 h-[52px] w-full rounded-full bg-relleno px-5 text-[16px] font-medium outline-none placeholder:text-sutil"
          />
          <Boton type="submit" disabled={!nombreNueva.trim()} className="mt-5">
            Crear y usar
          </Boton>
        </form>
      </Hoja>
    </main>
  );
}
