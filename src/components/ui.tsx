"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icono, ICONOS } from "@/components/Iconos";
import { mesDe, hoy, nombreMes, pesos, sumarMeses } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

/** Encabezado de las pantallas claras: título grande, quién usa la app y mes. */
export function Encabezado({ titulo, conMes = true }: { titulo: string; conMes?: boolean }) {
  return (
    <header className="px-5 pt-[max(env(safe-area-inset-top),1.25rem)]">
      <div className="flex items-center justify-between gap-3">
        <SelectorUsuario />
        {conMes && <SelectorMes />}
        <BotonAjustes />
      </div>
      <h1 className="mt-6 text-[28px] font-bold leading-tight tracking-tight">{titulo}</h1>
    </header>
  );
}

/** Pastilla con flechas para cambiar de mes. Tocar el nombre vuelve al mes actual. */
export function SelectorMes({ oscuro = false }: { oscuro?: boolean }) {
  const { mes, setMes } = useBilletera();
  const esMesActual = mes === mesDe(hoy());
  const base = oscuro ? "bg-white/10 text-white" : "bg-tarjeta text-texto";
  const flecha = oscuro ? "text-white/70 hover:bg-white/10" : "text-tenue hover:bg-fondo";
  return (
    <div className={`flex items-center rounded-full p-1 ${base}`}>
      <button onClick={() => setMes(sumarMeses(mes, -1))} aria-label="Mes anterior" className={`grid size-8 place-items-center rounded-full ${flecha}`}>
        <Icono trazo={ICONOS.atras} className="size-4" />
      </button>
      <button
        onClick={() => setMes(mesDe(hoy()))}
        title={esMesActual ? undefined : "Volver al mes actual"}
        className="min-w-[8.5rem] px-1 text-center text-sm font-semibold capitalize"
      >
        {nombreMes(mes)}
      </button>
      <button onClick={() => setMes(sumarMeses(mes, 1))} aria-label="Mes siguiente" className={`grid size-8 place-items-center rounded-full ${flecha}`}>
        <Icono trazo={ICONOS.adelante} className="size-4" />
      </button>
    </div>
  );
}

/** En el POC no hay login: tocar el avatar cambia quién está usando la app. */
export function SelectorUsuario({ oscuro = false }: { oscuro?: boolean }) {
  const { datos, usuarioId, setUsuarioId } = useBilletera();
  const actual = datos.miembros.find((m) => m.id === usuarioId) ?? datos.miembros[0];
  const otro = datos.miembros.find((m) => m.id !== actual?.id);
  if (!actual) return null;
  return (
    <button
      onClick={() => otro && setUsuarioId(otro.id)}
      aria-label={`Usando la app como ${actual.nombre}. Tocá para cambiar${otro ? ` a ${otro.nombre}` : ""}.`}
      className="flex items-center gap-2"
    >
      <Avatar nombre={actual.nombre} oscuro={oscuro} />
    </button>
  );
}

export function Avatar({ nombre, oscuro = false, grande = false }: { nombre: string; oscuro?: boolean; grande?: boolean }) {
  const tam = grande ? "size-12 text-lg" : "size-10 text-[15px]";
  const color = oscuro ? "bg-menta text-bosque-hondo" : "bg-bosque text-menta";
  return <span className={`grid shrink-0 place-items-center rounded-full font-bold ${tam} ${color}`}>{nombre.charAt(0)}</span>;
}

export function BotonAjustes({ oscuro = false }: { oscuro?: boolean }) {
  return (
    <Link
      href="/ajustes"
      aria-label="Ajustes"
      className={`grid size-10 place-items-center rounded-full ${oscuro ? "bg-white/10 text-white" : "bg-tarjeta text-texto"}`}
    >
      <Icono trazo={ICONOS.ajustes} className="size-5" />
    </Link>
  );
}

export function Tarjeta({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[28px] bg-tarjeta p-5 ${className}`}>{children}</section>;
}

/** Título de bloque con acción opcional a la derecha. */
export function TituloBloque({ children, href, accion }: { children: React.ReactNode; href?: string; accion?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <h2 className="text-lg font-bold tracking-tight">{children}</h2>
      {href && accion && (
        <Link href={href} className="flex items-center gap-0.5 text-sm font-semibold text-queda">
          {accion}
          <Icono trazo={ICONOS.adelante} className="size-4" />
        </Link>
      )}
    </div>
  );
}

/** Monto coloreado: verde si queda, rojo si te pasaste, "–" si es cero. */
export function MontoQueda({ monto, className = "" }: { monto: number; className?: string }) {
  const r = Math.round(monto);
  const color = r > 0 ? "text-queda" : r < 0 ? "text-pasaste" : "text-tenue";
  return <span className={`tabular-nums ${color} ${className}`}>{pesos(monto)}</span>;
}

export function Fila({ etiqueta, valor, fuerte = false }: { etiqueta: string; valor: React.ReactNode; fuerte?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between py-1.5 ${fuerte ? "font-semibold" : ""}`}>
      <span className={fuerte ? "" : "text-tenue"}>{etiqueta}</span>
      <span className="tabular-nums">{valor}</span>
    </div>
  );
}

/** Monto grande con el signo $ chico y alto, como en las billeteras. */
export function MontoGrande({ monto, className = "" }: { monto: number; className?: string }) {
  const texto = pesos(monto, { ceroComoGuion: false });
  const negativo = texto.startsWith("-");
  const numero = texto.replace(/^-?\$/, "");
  return (
    <span className={`inline-flex items-start font-bold tracking-[-0.035em] tabular-nums ${className}`}>
      {negativo && <span>−</span>}
      <span className="mr-1 mt-[0.18em] text-[0.45em] font-semibold tracking-normal opacity-70">$</span>
      {numero}
    </span>
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
      <button className="velo-entra absolute inset-0 bg-bosque-hondo/45" aria-label="Cerrar" onClick={alCerrar} />
      <div className="hoja-entra relative w-full max-w-md rounded-t-[32px] bg-tarjeta px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-linea" />
        {children}
      </div>
    </div>
  );
}
