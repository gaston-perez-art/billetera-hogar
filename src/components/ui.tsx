"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icono, ICONOS } from "@/components/Iconos";
import { mesDe, hoy, montoATexto, montoEnVivo, nombreMes, pesos, sumarMeses } from "@/lib/formato";
import { useFotos } from "@/lib/fotos";
import { useBilletera } from "@/lib/store";

/*
 * Piezas compartidas. Reglas:
 * - Fondo blanco. El número principal de cada pantalla va en Resumen, centrado.
 * - Un solo gráfico por pantalla, en Resumen. Las listas no llevan barras: dicen el estado con palabras.
 * - Listas sin contenedor: filas directas sobre blanco, ícono en círculo con borde fino (como MP).
 * - Botones en forma de pastilla. Verde lleno para la acción principal.
 * - Signos de montos chicos y en el color del texto: "- $14.900". Verde solo para lo que entra.
 */

/**
 * Encabezado. En Inicio: saludo con avatar. En el resto: el título grande de la pantalla,
 * para que se sepa dónde estás. Tocar el avatar cambia quién usa la app.
 */
export function Encabezado({ titulo, conMes = true }: { titulo?: string; conMes?: boolean }) {
  return (
    <header className="px-5 pt-[max(env(safe-area-inset-top),0.75rem)]">
      <div className="flex min-h-12 items-center justify-between gap-3">
        {titulo ? <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">{titulo}</h1> : <Saludo />}
        <div className="flex items-center gap-2">
          {titulo && <CambiarUsuario />}
          <Link href="/ajustes" aria-label="Ajustes" className="grid size-10 place-items-center rounded-full bg-relleno text-texto">
            <Icono trazo={ICONOS.ajustes} className="size-5" />
          </Link>
        </div>
      </div>
      {conMes && <SelectorMes />}
    </header>
  );
}

function useUsuarios() {
  const { datos, usuarioId, setUsuarioId } = useBilletera();
  const actual = datos.miembros.find((m) => m.id === usuarioId) ?? datos.miembros[0];
  const otro = datos.miembros.find((m) => m.id !== actual?.id);
  // Con login (modo nube) quién usa la app lo define la cuenta: no se cambia desde acá.
  const cambiar = () => otro && setUsuarioId?.(otro.id);
  const etiqueta = !actual
    ? ""
    : setUsuarioId
      ? `Usando la app como ${actual.nombre}. Tocá para cambiar${otro ? ` a ${otro.nombre}` : ""}.`
      : `Usando la app como ${actual.nombre}.`;
  return { actual, cambiar, etiqueta };
}

function Saludo() {
  const { actual, cambiar, etiqueta } = useUsuarios();
  if (!actual) return null;
  return (
    <button onClick={cambiar} aria-label={etiqueta} className="flex items-center gap-2 rounded-full bg-relleno py-1 pl-1 pr-3.5">
      <Avatar id={actual.id} nombre={actual.nombre} />
      <span className="text-[15px] font-semibold">¡Hola, {actual.nombre}!</span>
    </button>
  );
}

function CambiarUsuario() {
  const { actual, cambiar, etiqueta } = useUsuarios();
  if (!actual) return null;
  return (
    <button onClick={cambiar} aria-label={etiqueta} className="rounded-full">
      <Avatar id={actual.id} nombre={actual.nombre} tamano={40} />
    </button>
  );
}

/** Chip con el mes y flechas. Tocar el nombre vuelve al mes actual. */
function SelectorMes() {
  const { mes, setMes } = useBilletera();
  const esMesActual = mes === mesDe(hoy());
  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="flex items-center rounded-full border-[1.5px] border-marca p-0.5">
        <button onClick={() => setMes(sumarMeses(mes, -1))} aria-label="Mes anterior" className="grid size-8 place-items-center rounded-full text-marca active:bg-marca-suave">
          <Icono trazo={ICONOS.atras} className="size-4" />
        </button>
        <span className="px-1 text-[14px] font-semibold capitalize text-marca">{nombreMes(mes)}</span>
        <button onClick={() => setMes(sumarMeses(mes, 1))} aria-label="Mes siguiente" className="grid size-8 place-items-center rounded-full text-marca active:bg-marca-suave">
          <Icono trazo={ICONOS.adelante} className="size-4" />
        </button>
      </div>
      {!esMesActual && (
        <button onClick={() => setMes(mesDe(hoy()))} className="h-9 rounded-full bg-relleno px-3.5 text-[14px] font-semibold active:opacity-70">
          Hoy
        </button>
      )}
    </div>
  );
}

/** Foto de perfil si hay una cargada; si no, la inicial sobre el verde de marca. */
export function Avatar({ id, nombre, tamano = 32 }: { id?: string; nombre: string; tamano?: number }) {
  const { fotos } = useFotos();
  const foto = id ? fotos[id] : undefined;
  const estilo = { width: tamano, height: tamano, fontSize: Math.round(tamano * 0.4) };
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element -- data URL local, sin optimizar
    <img src={foto} alt="" style={estilo} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span style={estilo} className="grid shrink-0 place-items-center rounded-full bg-marca font-semibold text-sobre-marca">
      {nombre.charAt(0)}
    </span>
  );
}

/** El número principal de la pantalla: tarjeta blanca, centrado, con su leyenda abajo. */
export function Resumen({ etiqueta, monto, tono, children }: { etiqueta: string; monto: number; tono?: "queda"; children?: React.ReactNode }) {
  const color = tono === "queda" && Math.round(monto) < 0 ? "text-pasaste" : "text-texto";
  return (
    <section className="mx-5 mt-4 rounded-3xl bg-tarjeta px-5 pb-5 pt-6 text-center shadow-tarjeta ring-1 ring-linea">
      <MontoGrande monto={monto} className={`text-[40px] leading-none ${color}`} />
      <p className="mt-2 text-[14px] text-tenue">{etiqueta}</p>
      {children && <div className="mt-5 border-t border-linea pt-4">{children}</div>}
    </section>
  );
}

/** Monto grande: el "$" chico y arriba, como en MP; el signo menos fino y chico. */
export function MontoGrande({ monto, className = "" }: { monto: number; className?: string }) {
  const texto = pesos(monto, { ceroComoGuion: false });
  const negativo = texto.startsWith("-");
  const numero = texto.replace(/^-?\$/, "");
  return (
    <span className={`inline-flex items-start font-semibold tracking-[-0.03em] tabular-nums ${className}`}>
      {negativo && <span className="mr-[0.08em] mt-[0.22em] text-[0.5em] font-medium leading-none">-</span>}
      <span className="mr-[0.1em] mt-[0.16em] text-[0.45em] font-medium leading-none tracking-normal text-tenue">$</span>
      <span className="leading-none">{numero}</span>
    </span>
  );
}

/** Cifras chicas en columnas, para debajo del número principal. */
export function Cifras({ items }: { items: { etiqueta: string; valor: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((i) => (
        <div key={i.etiqueta}>
          <dt className="text-[12px] text-tenue">{i.etiqueta}</dt>
          <dd className="mt-0.5 text-[14px] font-semibold tabular-nums">{i.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Botón pastilla. "principal" en verde lleno; "secundario" en verde suave. */
export function Boton({
  children,
  variante = "principal",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "principal" | "secundario" | "peligro" }) {
  return (
    <button className={`${estiloBoton(variante)} w-full ${className}`} {...props}>
      {children}
    </button>
  );
}

export function estiloBoton(variante: "principal" | "secundario" | "peligro" = "principal") {
  const colores = {
    principal: "bg-marca text-sobre-marca disabled:bg-relleno disabled:text-sutil",
    secundario: "bg-marca-suave text-marca",
    peligro: "bg-relleno text-pasaste",
  }[variante];
  return `flex h-[52px] items-center justify-center gap-2 rounded-full text-[16px] font-semibold transition active:opacity-80 ${colores}`;
}

/** Bloque de lista: título con flecha opcional y filas directas sobre blanco. */
export function Grupo({
  titulo,
  accion,
  detalle,
  children,
}: {
  titulo?: string;
  accion?: { texto: string; href: string };
  detalle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      {titulo && (
        <div className="flex h-10 items-center justify-between px-5">
          <h2 className="text-[16px] font-semibold">{titulo}</h2>
          {accion && (
            <Link href={accion.href} aria-label={accion.texto} className="grid size-8 place-items-center rounded-full bg-relleno active:opacity-70">
              <Icono trazo={ICONOS.adelante} className="size-4" />
            </Link>
          )}
          {detalle && <span className="text-[13px] text-tenue tabular-nums">{detalle}</span>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}

/** Fila estándar: ícono, título y bajada, valor a la derecha. */
export function FilaLista({
  icono,
  titulo,
  bajada,
  valor,
  valorBajada,
  apagada = false,
  onClick,
}: {
  icono?: React.ReactNode;
  titulo: React.ReactNode;
  bajada?: React.ReactNode;
  valor?: React.ReactNode;
  valorBajada?: React.ReactNode;
  apagada?: boolean;
  onClick?: () => void;
}) {
  const contenido = (
    <>
      {icono}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[15px] font-medium ${apagada ? "text-tenue" : ""}`}>{titulo}</span>
        {bajada && <span className="mt-0.5 block truncate text-[13px] text-tenue">{bajada}</span>}
      </span>
      {(valor !== undefined || valorBajada) && (
        <span className="shrink-0 text-right">
          {valor !== undefined && <span className={`block text-[15px] font-semibold tabular-nums ${apagada ? "text-tenue" : ""}`}>{valor}</span>}
          {valorBajada && <span className="mt-0.5 block text-[13px] text-tenue tabular-nums">{valorBajada}</span>}
        </span>
      )}
    </>
  );
  const clases = "flex min-h-16 w-full items-center gap-3 px-5 py-2.5 text-left";
  return onClick ? (
    <button onClick={onClick} className={`${clases} fila`}>
      {contenido}
    </button>
  ) : (
    <div className={clases}>{contenido}</div>
  );
}

/** Monto de un movimiento como en MP: "- $14.900" en el color del texto; "+ $900.000" en verde si entra. */
export function MontoMovimiento({ monto }: { monto: number }) {
  const entra = monto < 0;
  return (
    <span className={`whitespace-nowrap tabular-nums ${entra ? "text-queda" : ""}`}>
      <span className="font-normal">{entra ? "+" : "-"}&#8239;</span>
      {pesos(Math.abs(monto), { ceroComoGuion: false })}
    </span>
  );
}

/** Monto coloreado: verde si queda, rojo si te pasaste, "–" si es cero. */
export function MontoQueda({ monto, className = "" }: { monto: number; className?: string }) {
  const r = Math.round(monto);
  const color = r > 0 ? "text-queda" : r < 0 ? "text-pasaste" : "text-tenue";
  return <span className={`tabular-nums ${color} ${className}`}>{pesos(monto)}</span>;
}

/**
 * Hoja que sube desde abajo, para detalles y para editar. Baja suave al cerrarse.
 * Con `mostrarTitulo`, el título va arriba de la hoja.
 */
export function Hoja({
  abierta,
  alCerrar,
  titulo,
  mostrarTitulo = false,
  children,
}: {
  abierta: boolean;
  alCerrar: () => void;
  titulo: string;
  mostrarTitulo?: boolean;
  children: React.ReactNode;
}) {
  const [montada, setMontada] = useState(abierta);
  const [saliendo, setSaliendo] = useState(false);
  // Guarda el último contenido para que no desaparezca mientras la hoja baja.
  const ultimo = useRef(children);
  if (abierta) ultimo.current = children;

  useEffect(() => {
    if (abierta) {
      setMontada(true);
      setSaliendo(false);
      return;
    }
    if (!montada) return;
    setSaliendo(true);
    const t = setTimeout(() => {
      setMontada(false);
      setSaliendo(false);
    }, 200);
    return () => clearTimeout(t);
  }, [abierta, montada]);

  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierta, alCerrar]);

  if (!montada) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <button className={`absolute inset-0 bg-black/40 ${saliendo ? "velo-sale" : "velo-entra"}`} aria-label="Cerrar" onClick={alCerrar} />
      <div
        className={`relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-tarjeta px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-2.5 shadow-hoja ${
          saliendo ? "hoja-sale" : "hoja-entra"
        }`}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-linea" />
        {mostrarTitulo && <h2 className="mb-4 text-[20px] font-bold tracking-[-0.01em]">{titulo}</h2>}
        {abierta ? children : ultimo.current}
      </div>
    </div>
  );
}

/**
 * Campo de monto grande, con formato mientras se escribe: "5.000.000,32".
 * El "$" va chico y arriba, como en MP.
 */
export function CampoMonto({
  valor,
  onCambio,
  autoFocus = false,
  etiqueta = "Monto",
  onEnter,
}: {
  valor: number;
  onCambio: (v: number) => void;
  autoFocus?: boolean;
  etiqueta?: string;
  onEnter?: () => void;
}) {
  const [texto, setTexto] = useState(() => montoATexto(valor));
  return (
    <label className="flex items-start justify-center text-[48px] font-semibold leading-none tracking-[-0.03em]">
      <span className="mr-1.5 mt-[0.2em] text-[22px] font-medium tracking-normal text-tenue">$</span>
      <input
        autoFocus={autoFocus}
        inputMode="decimal"
        enterKeyHint="done"
        value={texto}
        onChange={(e) => {
          const r = montoEnVivo(e.target.value, texto);
          setTexto(r.texto);
          onCambio(r.valor);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        placeholder="0"
        aria-label={etiqueta}
        size={Math.max(texto.length, 1)}
        className="min-w-[1ch] max-w-full bg-transparent text-left tabular-nums caret-marca outline-none placeholder:text-sutil"
      />
    </label>
  );
}

/** Sección que se abre y se cierra, con su resumen a la vista cuando está cerrada. */
export function Seccion({
  titulo,
  resumen,
  abierta,
  alTocar,
  children,
}: {
  titulo: string;
  resumen: React.ReactNode;
  abierta: boolean;
  alTocar: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-5 overflow-hidden rounded-3xl bg-tarjeta shadow-tarjeta ring-1 ring-linea">
      <button onClick={alTocar} aria-expanded={abierta} className="fila flex w-full items-center gap-3 px-5 py-4 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold">{titulo}</span>
          <span className="mt-0.5 block text-[14px] text-tenue tabular-nums">{resumen}</span>
        </span>
        <Icono trazo={ICONOS.adelante} className={`size-5 shrink-0 text-tenue transition-transform duration-200 ${abierta ? "rotate-90" : ""}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-250 ease-out motion-reduce:transition-none ${abierta ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-linea pb-2 pt-1">{children}</div>
        </div>
      </div>
    </section>
  );
}

/** Fila etiqueta / valor para detalles. */
export function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-[15px] text-tenue">{etiqueta}</dt>
      <dd className="text-[15px] font-medium tabular-nums">{valor}</dd>
    </div>
  );
}

/** Día del pago en el lugar del ícono: texto simple dentro de un círculo con borde fino. Rojo si venció. */
export function Fecha({ dia, mes, vencida = false }: { dia: number; mes: string; vencida?: boolean }) {
  return (
    <span
      className={`flex size-11 shrink-0 flex-col items-center justify-center rounded-full border-[1.5px] leading-none ${
        vencida ? "border-pasaste/40 text-pasaste" : "border-linea text-texto"
      }`}
    >
      <span className="text-[15px] font-semibold tabular-nums">{dia}</span>
      <span className={`mt-0.5 text-[10px] font-medium ${vencida ? "" : "text-tenue"}`}>{mes}</span>
    </span>
  );
}
