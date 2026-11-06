"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icono, ICONOS } from "@/components/Iconos";
import { mesDe, hoy, nombreMes, pesos, sumarMeses } from "@/lib/formato";
import { useFotos } from "@/lib/fotos";
import { useBilletera } from "@/lib/store";

/*
 * Piezas compartidas. Reglas:
 * - Fondo blanco. El número principal de cada pantalla va en TarjetaSaldo, centrado.
 * - Listas sin contenedor: filas directas sobre blanco, ícono en círculo verde suave.
 * - Botones en forma de pastilla. Verde lleno para la acción principal.
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
  const cambiar = () => otro && setUsuarioId(otro.id);
  const etiqueta = actual ? `Usando la app como ${actual.nombre}. Tocá para cambiar${otro ? ` a ${otro.nombre}` : ""}.` : "";
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

/** Monto grande con el "$" chico. */
export function MontoGrande({ monto, className = "" }: { monto: number; className?: string }) {
  const texto = pesos(monto, { ceroComoGuion: false });
  const negativo = texto.startsWith("-");
  const numero = texto.replace(/^-?\$/, "");
  return (
    <span className={`inline-flex items-baseline font-medium tracking-[-0.02em] tabular-nums ${className}`}>
      {negativo && <span>−</span>}
      <span className="mr-1 text-[0.55em] font-medium tracking-normal">$</span>
      {numero}
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

/** Monto de un movimiento con el signo en color: − rojo si sale, + verde si entra. */
export function MontoMovimiento({ monto }: { monto: number }) {
  return (
    <span className="tabular-nums">
      <span className={monto < 0 ? "text-queda" : "text-pasaste"}>{monto < 0 ? "+" : "−"}</span>
      {pesos(Math.abs(monto))}
    </span>
  );
}

/** Monto coloreado: verde si queda, rojo si te pasaste, "–" si es cero. */
export function MontoQueda({ monto, className = "" }: { monto: number; className?: string }) {
  const r = Math.round(monto);
  const color = r > 0 ? "text-queda" : r < 0 ? "text-pasaste" : "text-tenue";
  return <span className={`tabular-nums ${color} ${className}`}>{pesos(monto)}</span>;
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
      <button className="velo-entra absolute inset-0 bg-black/40" aria-label="Cerrar" onClick={alCerrar} />
      <div className="hoja-entra relative w-full max-w-md rounded-t-[28px] bg-tarjeta px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-2.5">
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
    <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-full bg-marca-suave leading-none text-marca">
      <span className="text-[15px] font-semibold tabular-nums">{dia}</span>
      <span className="mt-0.5 text-[10px] font-medium">{mes}</span>
    </span>
  );
}
