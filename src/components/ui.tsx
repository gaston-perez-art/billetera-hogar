"use client";

import Link from "next/link";
import { mesDe, hoy, nombreMes, pesos, sumarMeses } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

/** Encabezado de cada pantalla: título, quién está usando la app y selector de mes. */
export function Encabezado({ titulo, conMes = true }: { titulo: string; conMes?: boolean }) {
  const { mes, setMes } = useBilletera();
  const esMesActual = mes === mesDe(hoy());
  return (
    <header className="px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
        <div className="flex items-center gap-2">
          <SelectorUsuario />
          <Link href="/ajustes" aria-label="Ajustes" className="grid size-9 place-items-center rounded-full text-tenue hover:bg-linea">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </Link>
        </div>
      </div>
      {conMes && (
        <div className="mt-3 flex items-center justify-between rounded-full bg-tarjeta px-1 py-1 shadow-sm">
          <BotonMes direccion={-1} onClick={() => setMes(sumarMeses(mes, -1))} />
          <button
            className="text-sm font-medium capitalize"
            onClick={() => setMes(mesDe(hoy()))}
            title="Volver al mes actual"
          >
            {nombreMes(mes)}
            {!esMesActual && <span className="ml-2 text-xs font-normal text-marca">volver a hoy</span>}
          </button>
          <BotonMes direccion={1} onClick={() => setMes(sumarMeses(mes, 1))} />
        </div>
      )}
    </header>
  );
}

function BotonMes({ direccion, onClick }: { direccion: 1 | -1; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={direccion < 0 ? "Mes anterior" : "Mes siguiente"}
      className="grid size-8 place-items-center rounded-full text-tenue hover:bg-fondo"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
        <path d={direccion < 0 ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}

/** En el POC no hay login: se elige quién está usando la app. Con Supabase sale del usuario logueado. */
function SelectorUsuario() {
  const { datos, usuarioId, setUsuarioId } = useBilletera();
  return (
    <div className="flex rounded-full bg-linea/70 p-0.5 text-xs font-medium">
      {datos.miembros.map((m) => (
        <button
          key={m.id}
          onClick={() => setUsuarioId(m.id)}
          className={`rounded-full px-2.5 py-1 transition ${
            usuarioId === m.id ? "bg-tarjeta text-texto shadow-sm" : "text-tenue"
          }`}
        >
          {m.nombre}
        </button>
      ))}
    </div>
  );
}

export function Tarjeta({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-tarjeta p-4 shadow-sm ${className}`}>{children}</section>;
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
