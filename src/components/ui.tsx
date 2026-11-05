"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icono, ICONOS } from "@/components/Iconos";
import { mesDe, hoy, nombreMes, pesos, sumarMeses } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

/*
 * Piezas compartidas. Reglas:
 * - Un número protagonista por pantalla (MontoGrande). Lo demás, tamaño de lectura.
 * - Listas en grupos blancos con divisores finos. Sin sombras.
 * - Una sola acción principal por pantalla (Boton variante "principal").
 */

/** Barra superior: mes a la izquierda, quién usa la app y ajustes a la derecha. */
export function Encabezado({ titulo, conMes = true }: { titulo?: string; conMes?: boolean }) {
  return (
    <header className="flex h-14 items-center justify-between gap-2 px-4 pt-[env(safe-area-inset-top)] mt-2">
      {conMes ? <SelectorMes /> : <h1 className="px-1 text-[17px] font-semibold">{titulo}</h1>}
      <div className="flex items-center gap-1">
        <SelectorUsuario />
        <Link href="/ajustes" aria-label="Ajustes" className="grid size-10 place-items-center rounded-full text-tenue active:bg-relleno">
          <Icono trazo={ICONOS.ajustes} className="size-[22px]" />
        </Link>
      </div>
    </header>
  );
}

function SelectorMes() {
  const { mes, setMes } = useBilletera();
  const esMesActual = mes === mesDe(hoy());
  return (
    <div className="flex items-center">
      <button onClick={() => setMes(sumarMeses(mes, -1))} aria-label="Mes anterior" className="grid size-9 place-items-center rounded-full text-tenue active:bg-relleno">
        <Icono trazo={ICONOS.atras} className="size-[18px]" />
      </button>
      <button
        onClick={() => setMes(mesDe(hoy()))}
        disabled={esMesActual}
        title={esMesActual ? undefined : "Volver al mes actual"}
        className="px-1 text-[17px] font-semibold capitalize"
      >
        {nombreMes(mes)}
      </button>
      <button onClick={() => setMes(sumarMeses(mes, 1))} aria-label="Mes siguiente" className="grid size-9 place-items-center rounded-full text-tenue active:bg-relleno">
        <Icono trazo={ICONOS.adelante} className="size-[18px]" />
      </button>
    </div>
  );
}

/** En el POC no hay login: tocar la inicial cambia quién está usando la app. */
function SelectorUsuario() {
  const { datos, usuarioId, setUsuarioId } = useBilletera();
  const actual = datos.miembros.find((m) => m.id === usuarioId) ?? datos.miembros[0];
  const otro = datos.miembros.find((m) => m.id !== actual?.id);
  if (!actual) return null;
  return (
    <button
      onClick={() => otro && setUsuarioId(otro.id)}
      aria-label={`Usando la app como ${actual.nombre}. Tocá para cambiar${otro ? ` a ${otro.nombre}` : ""}.`}
      className="grid size-10 place-items-center"
    >
      <Avatar nombre={actual.nombre} />
    </button>
  );
}

export function Avatar({ nombre }: { nombre: string }) {
  return <span className="grid size-8 place-items-center rounded-full bg-marca text-[13px] font-semibold text-white">{nombre.charAt(0)}</span>;
}

/** El número de la pantalla, con su etiqueta arriba y un detalle opcional abajo. */
export function Resumen({ etiqueta, monto, tono, children }: { etiqueta: string; monto: number; tono?: "queda"; children?: React.ReactNode }) {
  const color = tono === "queda" ? (Math.round(monto) < 0 ? "text-pasaste" : "text-texto") : "text-texto";
  return (
    <section className="px-5 pb-6 pt-4">
      <p className="text-[15px] text-tenue">{etiqueta}</p>
      <MontoGrande monto={monto} className={`mt-1 text-[44px] leading-[1.05] ${color}`} />
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}

/** Monto grande con el "$" chico y alto. */
export function MontoGrande({ monto, className = "" }: { monto: number; className?: string }) {
  const texto = pesos(monto, { ceroComoGuion: false });
  const negativo = texto.startsWith("-");
  const numero = texto.replace(/^-?\$/, "");
  return (
    <span className={`inline-flex items-start font-semibold tracking-[-0.03em] tabular-nums ${className}`}>
      {negativo && <span>−</span>}
      <span className="mr-0.5 mt-[0.16em] text-[0.5em] font-medium tracking-normal">$</span>
      {numero}
    </span>
  );
}

/** Grupo de filas sobre blanco, con divisores finos. */
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
    <section className="px-4">
      {titulo && (
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h2 className="text-[15px] font-semibold">{titulo}</h2>
          {accion && (
            <Link href={accion.href} className="text-[15px] text-tenue">
              {accion.texto}
            </Link>
          )}
          {detalle && <span className="text-[13px] text-tenue tabular-nums">{detalle}</span>}
        </div>
      )}
      <div className="divide-y divide-linea overflow-hidden rounded-2xl bg-tarjeta">{children}</div>
    </section>
  );
}

/** Fila estándar: ícono opcional, título y bajada, valor a la derecha. */
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
  const clases = "flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left";
  return onClick ? (
    <button onClick={onClick} className={`${clases} active:bg-relleno`}>
      {contenido}
    </button>
  ) : (
    <div className={clases}>{contenido}</div>
  );
}

/** Monto coloreado: verde si queda, rojo si te pasaste, "–" si es cero. */
export function MontoQueda({ monto, className = "" }: { monto: number; className?: string }) {
  const r = Math.round(monto);
  const color = r > 0 ? "text-queda" : r < 0 ? "text-pasaste" : "text-tenue";
  return <span className={`tabular-nums ${color} ${className}`}>{pesos(monto)}</span>;
}

/** Botón. "principal" es la única acción fuerte de la pantalla. */
export function Boton({
  children,
  variante = "principal",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "principal" | "secundario" | "peligro" }) {
  const estilos = {
    principal: "bg-marca text-white disabled:bg-relleno disabled:text-sutil",
    secundario: "bg-relleno text-texto",
    peligro: "bg-relleno text-pasaste",
  }[variante];
  return (
    <button className={`h-[52px] w-full rounded-xl text-[16px] font-semibold transition active:opacity-80 ${estilos} ${className}`} {...props}>
      {children}
    </button>
  );
}

/** Hoja que sube desde abajo, para detalles y confirmaciones. */
export function Hoja({ abierta, alCerrar, titulo, children }: { abierta: boolean; alCerrar: () => void; titulo: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierta, alCerrar]);
  if (!abierta) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <button className="velo-entra absolute inset-0 bg-black/30" aria-label="Cerrar" onClick={alCerrar} />
      <div className="hoja-entra relative w-full max-w-md rounded-t-3xl bg-tarjeta px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-2.5">
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-linea" />
        {children}
      </div>
    </div>
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

/** Día del pago en el lugar del ícono. */
export function Fecha({ dia, mes }: { dia: number; mes: string }) {
  return (
    <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-full bg-relleno leading-none">
      <span className="text-[15px] font-semibold tabular-nums">{dia}</span>
      <span className="mt-0.5 text-[10px] font-medium text-tenue">{mes}</span>
    </span>
  );
}
