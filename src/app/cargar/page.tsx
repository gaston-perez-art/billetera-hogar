"use client";

// Cargar gasto en 3 toques: monto → categoría → detalle.
// Fecha = hoy y "pagó" = quien está usando la app, editables en el paso 3.
// Los pasos deslizan de lado; volver atrás desliza al revés.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icono, IconoCategoria, ICONOS } from "@/components/Iconos";
import { Boton, Hoja, Interruptor, MontoGrande, TarjetaLista } from "@/components/ui";
import { leerCargaRapida } from "@/lib/rapido";
import { desdeMonto, evaluar, mostrar, OPERADORES, teclear, tieneOperador, type Tecla } from "@/lib/calculadora";
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
  // Teclado propio con cuentas: los términos de la cuenta ("29000", "+", "14000").
  const [terminos, setTerminos] = useState<string[]>([]);
  const resultado = evaluar(terminos);
  const conCuenta = tieneOperador(terminos);
  const tocar = (tecla: Tecla) => setTerminos((t) => teclear(t, tecla));
  // Mantener apretado borrar vacía todo.
  const borrandoTodo = useRef<ReturnType<typeof setTimeout> | null>(null);

  function continuarMonto() {
    if (resultado <= 0) return;
    setMonto(resultado);
    // Si volvés a este paso, se ve el resultado y no la cuenta.
    setTerminos(desdeMonto(resultado));
    setPaso("categoria");
  }

  // Carga rápida: un Atajo del iPhone abre /cargar/?texto=gasté 5 lucas en súper (o con
  // ?monto=&categoria=&detalle=). Se completa lo que se entendió y se va al paso que falta:
  // con monto y categoría, directo a "Revisá y guardá".
  const yaLeido = useRef(false);
  useEffect(() => {
    if (yaLeido.current || datos.categorias.length === 0) return;
    yaLeido.current = true;
    const p = new URLSearchParams(window.location.search);
    const texto = p.get("texto") ?? [p.get("monto"), p.get("categoria"), p.get("detalle")].filter(Boolean).join(" ");
    if (!texto.trim()) return;
    const r = leerCargaRapida(texto, datos.categorias);
    if (p.get("entra") === "1") r.entra = true;
    window.history.replaceState(null, "", window.location.pathname);
    if (r.monto > 0) {
      setMonto(r.monto);
      setTerminos(desdeMonto(r.monto));
    }
    setEntraPlata(r.entra);
    if (r.categoriaId) setCategoriaId(r.categoriaId);
    if (r.detalle) setDetalle(r.detalle);
    if (r.monto > 0) setPaso(r.categoriaId ? "detalle" : "categoria");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se lee una sola vez, con las categorías ya cargadas
  }, [datos.categorias]);

  // Con teclado físico (computadora) también se escribe y se calcula.
  useEffect(() => {
    if (paso !== "monto") return;
    const teclas: Record<string, Tecla> = { ",": ",", ".": ",", Backspace: "⌫", "+": "+", "-": "−", "*": "×", x: "×", "/": "÷" };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tecla = /^[0-9]$/.test(e.key) ? (e.key as Tecla) : teclas[e.key];
      if (tecla) {
        e.preventDefault();
        setTerminos((t) => teclear(t, tecla));
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [paso]);
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
    <main ref={contenedor} className="pantalla-fija fixed inset-0 z-30 mx-auto flex max-w-md flex-col overflow-y-auto overflow-x-hidden bg-fondo px-5 pt-[env(safe-area-inset-top)]">
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
            continuarMonto();
          }}
        >
          <div className="flex min-h-36 flex-1 flex-col items-center justify-center text-center" aria-live="polite">
            <p
              className={`max-w-full break-words font-semibold leading-[1.05] tracking-[-0.035em] tabular-nums ${tamanoCuenta(mostrar(terminos))} ${entraPlata && resultado > 0 ? "text-queda" : ""}`}
            >
              {entraPlata && <span className="mr-1 align-[0.35em] text-[0.55em] font-medium tracking-normal">+</span>}
              <span className={`mr-1 align-[0.35em] text-[0.55em] font-medium tracking-normal ${entraPlata && resultado > 0 ? "" : "text-tenue"}`}>$</span>
              {terminos.length ? mostrar(terminos) : <span className="text-sutil">0</span>}
            </p>
            <p className="mt-2 h-7 text-[20px] font-semibold tabular-nums text-tenue">
              {conCuenta && <>= {pesos(resultado, { ceroComoGuion: false })}</>}
            </p>
          </div>

          <label className="flex items-center justify-between gap-4 rounded-3xl superficie px-4 py-3 shadow-tarjeta ring-1 ring-linea">
            <span>
              <span className="block text-[15px] font-medium">Es plata que entra</span>
              <span className="mt-0.5 block text-[13px] text-tenue">Lo que ganaste con Uber, un préstamo.</span>
            </span>
            <Interruptor activo={entraPlata} onCambio={setEntraPlata} />
          </label>

          <Boton type="submit" disabled={resultado <= 0} className="mb-4 mt-4">
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
      {/* Teclado propio, al pie: sube como una hoja, como el del celular. */}
      {paso === "monto" && (
        <div className="hoja-entra -mx-5 shrink-0 rounded-t-[28px] bg-relleno px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-hoja">
          <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Teclado">
            {(["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", ",", "0", "⌫", "+"] as Tecla[]).map((tecla) => {
              const operador = (OPERADORES as string[]).includes(tecla);
              const borrar = tecla === "⌫";
              return (
                <button
                  key={tecla}
                  type="button"
                  onClick={() => tocar(tecla)}
                  onPointerDown={
                    borrar
                      ? () => {
                          borrandoTodo.current = setTimeout(() => setTerminos([]), 600);
                        }
                      : undefined
                  }
                  onPointerUp={borrar ? () => borrandoTodo.current && clearTimeout(borrandoTodo.current) : undefined}
                  onPointerLeave={borrar ? () => borrandoTodo.current && clearTimeout(borrandoTodo.current) : undefined}
                  aria-label={{ "÷": "Dividir", "×": "Multiplicar", "−": "Restar", "+": "Sumar", "⌫": "Borrar", ",": "Coma" }[tecla as string] ?? tecla}
                  className={`grid h-[52px] select-none place-items-center rounded-[12px] tabular-nums ${
                    operador
                      ? "bg-marca-suave text-[28px] font-medium text-marca active:bg-linea"
                      : borrar || tecla === ","
                        ? "text-[26px] text-texto active:bg-linea"
                        : "tecla text-[26px] font-medium"
                  }`}
                >
                  {borrar ? <Icono trazo={ICONOS.borrarTecla} className="size-7" /> : tecla}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}

/** Tamaño de la cuenta según lo larga que es: un monto solo se ve grande, una cuenta larga achica. */
function tamanoCuenta(texto: string): string {
  if (texto.length <= 9) return "text-[52px]";
  if (texto.length <= 14) return "text-[42px]";
  if (texto.length <= 20) return "text-[34px]";
  return "text-[28px]";
}
