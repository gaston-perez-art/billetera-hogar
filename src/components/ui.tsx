"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icono, ICONOS } from "@/components/Iconos";
import { alTocar } from "@/components/Tactil";
import { mesDe, hoy, montoATexto, montoEnVivo, nombreMes, pesos, sumarMeses } from "@/lib/formato";
import { useFotos } from "@/lib/fotos";
import { useBilletera } from "@/lib/store";
import { personaDeVista, useVista } from "@/lib/vista";

/*
 * Piezas compartidas. Reglas:
 * - Fondo gris apenas marcado y tarjetas blancas encima (como Galicia). El número principal
 *   de cada pantalla va en Resumen, centrado.
 * - Un solo gráfico por pantalla, en Resumen. Las listas no llevan barras: dicen el estado con palabras.
 * - Listas en una tarjeta (`TarjetaLista`), filas sin divisores, ícono en círculo con borde fino (como MP).
 * - Botones en forma de pastilla. Verde lleno para la acción principal.
 * - Signos de montos chicos y en el color del texto: "- $14.900". Verde solo para lo que entra.
 */

/**
 * Encabezado. En Inicio: saludo con avatar. En el resto: el título grande de la pantalla,
 * para que se sepa dónde estás. Tocar el avatar cambia quién usa la app.
 */
export function Encabezado({ titulo, conMes = true, conVista = false }: { titulo?: string; conMes?: boolean; conVista?: boolean }) {
  return (
    <header className="px-5 pt-[max(env(safe-area-inset-top),0.75rem)]">
      <div className="flex min-h-12 items-center justify-between gap-3">
        {titulo ? <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">{titulo}</h1> : <Saludo />}
        <div className="flex items-center gap-2">
          {titulo && <CambiarUsuario />}
          <BotonOjito />
          <Link href="/ajustes" aria-label="Ajustes" className={BOTON_REDONDO}>
            <Icono trazo={ICONOS.ajustes} className="size-5" />
          </Link>
        </div>
      </div>
      {(conMes || conVista) && (
        <div className="mt-3 flex items-center gap-2">
          {conMes && <SelectorMes />}
          {conVista && <SelectorVista />}
        </div>
      )}
    </header>
  );
}

/** Botón redondo del encabezado: blanco sobre el fondo gris, como las tarjetas. */
const BOTON_REDONDO = "grid size-10 place-items-center rounded-full superficie text-texto shadow-tarjeta ring-1 ring-linea";

/** El ojito: oculta o muestra todos los montos (para usar la app delante de otras personas). */
function BotonOjito() {
  const { montosOcultos, alternarMontosOcultos } = useBilletera();
  return (
    <button
      onClick={alternarMontosOcultos}
      aria-pressed={montosOcultos}
      aria-label={montosOcultos ? "Mostrar los montos" : "Ocultar los montos"}
      className={BOTON_REDONDO}
    >
      <Icono trazo={montosOcultos ? ICONOS.ojoTachado : ICONOS.ojo} className="size-5" />
    </button>
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
    <button onClick={cambiar} aria-label={etiqueta} className="flex items-center gap-2 rounded-full superficie py-1 pl-1 pr-3.5 shadow-tarjeta ring-1 ring-linea">
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
    <>
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
        <button onClick={() => setMes(mesDe(hoy()))} className="h-9 rounded-full superficie px-3.5 text-[14px] font-semibold shadow-tarjeta ring-1 ring-linea active:opacity-70">
          Hoy
        </button>
      )}
    </>
  );
}

/**
 * De quién se ve: la pareja, Gastón o Jime. Un desplegable chico junto al mes; la elección
 * cambia Inicio y Categorías en este celular. Se cierra al elegir o tocando afuera.
 */
function SelectorVista() {
  const [vista, setVista] = useVista();
  const { datos, usuarioId } = useBilletera();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const persona = personaDeVista(vista, usuarioId, datos.miembros);
  const elegida = datos.miembros.find((m) => m.id === persona);

  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: Event) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("pointerdown", afuera);
    return () => document.removeEventListener("pointerdown", afuera);
  }, [abierto]);

  if (datos.miembros.length === 0) return null;
  const opciones: { valor: string; nombre: string; icono: React.ReactNode }[] = [
    { valor: "pareja", nombre: "La pareja", icono: <IconoPareja /> },
    ...datos.miembros.map((m) => ({
      valor: m.id,
      nombre: m.id === usuarioId ? `${m.nombre} (vos)` : m.nombre,
      icono: <Avatar id={m.id} nombre={m.nombre} tamano={28} />,
    })),
  ];
  const elegir = (v: string) => {
    setVista(v);
    setAbierto(false);
  };

  // Se toca con alTocar: en iPhone el click a veces no llegaba. 44 px de alto con el borde.
  return (
    <div ref={caja} className="relative ml-auto">
      <button
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={`Viendo lo de ${elegida ? elegida.nombre : "la pareja"}. Tocá para cambiar.`}
        {...alTocar(() => setAbierto((a) => !a))}
        className="flex h-11 items-center gap-2 rounded-full superficie pl-1 pr-3 shadow-tarjeta ring-1 ring-linea"
      >
        {elegida ? <Avatar id={elegida.id} nombre={elegida.nombre} tamano={36} /> : <IconoPareja />}
        <span className="max-w-24 truncate text-[14px] font-semibold">{elegida ? elegida.nombre : "Pareja"}</span>
        <Icono trazo={ICONOS.abajo} className={`size-4 text-tenue transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>
      {abierto && (
        <ul role="listbox" aria-label="Ver lo de" className="absolute right-0 top-full z-30 mt-2 w-56 rounded-2xl superficie p-1.5 shadow-tarjeta ring-1 ring-linea">
          {opciones.map((o) => {
            const activa = (persona ?? "pareja") === o.valor;
            return (
              <li key={o.valor}>
                <button
                  role="option"
                  aria-selected={activa}
                  {...alTocar(() => elegir(o.valor))}
                  className="fila flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 text-left"
                >
                  {o.icono}
                  <span className="flex-1 truncate text-[15px] font-medium">{o.nombre}</span>
                  {activa && <Icono trazo={ICONOS.check} className="size-5 text-marca" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function IconoPareja() {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-marca text-sobre-marca">
      <Icono trazo={ICONOS.reparto} className="size-[18px]" />
    </span>
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
    <section className="mx-5 mt-4 rounded-3xl superficie px-5 pb-5 pt-6 text-center shadow-tarjeta ring-1 ring-linea">
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
    principal: "bg-marca text-sobre-marca disabled:bg-linea disabled:text-sutil",
    secundario: "bg-marca-suave text-marca",
    peligro: "bg-relleno text-pasaste",
  }[variante];
  return `flex h-[52px] items-center justify-center gap-2 rounded-full text-[16px] font-semibold transition active:opacity-80 ${colores}`;
}

/** Tarjeta blanca que agrupa filas de una lista. */
export function TarjetaLista({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-5 overflow-hidden rounded-3xl superficie py-1 shadow-tarjeta ring-1 ring-linea ${className}`}>{children}</div>;
}

/**
 * Bloque de lista: título con flecha opcional y las filas en una tarjeta.
 * Con `sinTarjeta`, las filas van sueltas (para armar varias tarjetas adentro, como la actividad por día).
 */
export function Grupo({
  titulo,
  accion,
  detalle,
  sinTarjeta = false,
  children,
}: {
  titulo?: string;
  accion?: { texto: string; href: string };
  detalle?: React.ReactNode;
  sinTarjeta?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      {titulo && (
        <div className="mb-1 flex h-10 items-center justify-between px-6">
          <h2 className="text-[16px] font-semibold">{titulo}</h2>
          {accion && (
            <Link href={accion.href} aria-label={accion.texto} className="grid size-8 place-items-center rounded-full bg-relleno active:opacity-70">
              <Icono trazo={ICONOS.adelante} className="size-4" />
            </Link>
          )}
          {detalle && <span className="text-[13px] text-tenue tabular-nums">{detalle}</span>}
        </div>
      )}
      {sinTarjeta ? <div>{children}</div> : <TarjetaLista>{children}</TarjetaLista>}
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
  const clases = "flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left";
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
        className={`relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] superficie px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-2.5 shadow-hoja ${
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
 * Modal centrado para avisos (como los de MP): tarjeta con imagen arriba, título, texto y botones.
 * La X va chica y discreta arriba a la derecha. Tocar afuera o Escape también cierra.
 */
export function Modal({
  abierta,
  alCerrar,
  titulo,
  imagen,
  children,
}: {
  abierta: boolean;
  alCerrar: () => void;
  titulo: string;
  imagen?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [montada, setMontada] = useState(abierta);
  const [saliendo, setSaliendo] = useState(false);
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
    }, 180);
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
    <div className="fixed inset-0 z-50 grid place-items-center px-5" role="dialog" aria-modal="true" aria-label={titulo}>
      <button className={`absolute inset-0 bg-black/45 ${saliendo ? "velo-sale" : "velo-entra"}`} aria-label="Cerrar" tabIndex={-1} onClick={alCerrar} />
      <div className={`relative w-full max-w-[360px] overflow-hidden rounded-[28px] superficie shadow-hoja ring-1 ring-linea ${saliendo ? "modal-sale" : "modal-entra"}`}>
        {imagen}
        <button
          onClick={alCerrar}
          aria-label="Cerrar"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-tarjeta/70 text-tenue backdrop-blur"
        >
          <Icono trazo={ICONOS.cerrar} className="size-4" />
        </button>
        <div className="px-6 pb-6 pt-5">{abierta ? children : ultimo.current}</div>
      </div>
    </div>
  );
}

/** Nombre editable arriba de la hoja, con lápiz. Con `fijo`, se muestra sin poder tocarlo y con el motivo. */
export function CampoNombre({
  etiqueta,
  valor,
  onCambio,
  fijo,
  placeholder,
  autoFocus = false,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  fijo?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-relleno px-4">
        <span className="shrink-0 text-[15px] font-medium">{etiqueta}</span>
        <input
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          readOnly={!!fijo}
          placeholder={placeholder}
          maxLength={40}
          autoFocus={autoFocus}
          enterKeyHint="done"
          className={`min-w-0 flex-1 truncate bg-transparent text-right text-[16px] font-medium outline-none placeholder:font-normal placeholder:text-sutil ${fijo ? "text-tenue" : ""}`}
        />
        {!fijo && <Icono trazo={ICONOS.lapiz} className="size-4 shrink-0 text-sutil" />}
      </label>
      {fijo && <p className="mt-1.5 px-1 text-[13px] text-tenue">{fijo}</p>}
    </div>
  );
}

/**
 * Campo de monto grande, con formato mientras se escribe: "5.000.000,32".
 * El "$" va en la misma línea que el número, más chico y tenue, pegado a la cifra.
 * El ancho del campo es el del texto (se mide con una copia invisible), así el monto
 * queda centrado de verdad y el "$" no se despega cuando hay puntos de miles.
 * Con `lapiz`, un lápiz sutil al lado avisa que el número se toca para editarlo.
 * Con `entra`, el monto va en verde con un "+" (plata que entra).
 */
export function CampoMonto({
  valor,
  onCambio,
  autoFocus = false,
  etiqueta = "Monto",
  onEnter,
  lapiz = false,
  entra = false,
  moneda = "$",
  chico = false,
}: {
  valor: number;
  onCambio: (v: number) => void;
  autoFocus?: boolean;
  etiqueta?: string;
  onEnter?: () => void;
  lapiz?: boolean;
  entra?: boolean;
  /** "US$" para montos en dólares. */
  moneda?: "$" | "US$";
  /** Más chico, para un segundo monto en la misma hoja (la cotización). */
  chico?: boolean;
}) {
  const [texto, setTexto] = useState(() => montoATexto(valor));
  const color = entra && valor > 0 ? "text-queda" : "";
  const signo = chico ? "text-[20px]" : "text-[30px]";
  return (
    <label className={`flex cursor-text items-baseline justify-center font-semibold leading-none tracking-[-0.035em] tabular-nums ${chico ? "text-[34px]" : "text-[52px]"} ${color}`}>
      {entra && <span className={`mr-1 ${signo} font-medium tracking-normal`}>+</span>}
      <span className={`mr-1 ${signo} font-medium tracking-normal ${entra && valor > 0 ? "" : "text-tenue"}`}>{moneda}</span>
      <span className="relative inline-grid min-w-0">
        <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre">
          {texto || "0"}
        </span>
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
          size={1}
          className="col-start-1 row-start-1 w-full min-w-0 bg-transparent p-0 text-left tracking-[inherit] caret-marca outline-none placeholder:text-sutil"
        />
      </span>
      {lapiz && <Icono trazo={ICONOS.lapiz} className="ml-2 size-5 shrink-0 self-center text-sutil" />}
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
    <section className="mx-5 overflow-hidden rounded-3xl superficie shadow-tarjeta ring-1 ring-linea">
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
export function Dato({ etiqueta, valor }: { etiqueta: React.ReactNode; valor: React.ReactNode }) {
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

/** Interruptor de sí/no, como el de iPhone. */
export function Interruptor({ activo, onCambio }: { activo: boolean; onCambio: (v: boolean) => void }) {
  return (
    <span className="relative shrink-0">
      <input type="checkbox" role="switch" checked={activo} onChange={(e) => onCambio(e.target.checked)} className="peer sr-only" />
      <span className="block h-[30px] w-[50px] rounded-full bg-linea transition peer-checked:bg-marca peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-texto" />
      <span className="absolute left-[3px] top-[3px] size-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition peer-checked:translate-x-5" />
    </span>
  );
}

/** Botones − y + con el número en el medio (día de vencimiento, cantidad de cuotas). */
export function Contador({
  valor,
  min,
  max,
  onCambio,
  menos,
  mas,
  texto,
}: {
  valor: number;
  min: number;
  max: number;
  onCambio: (n: number) => void;
  menos: string;
  mas: string;
  /** Lo que se muestra en el medio, si no es el número (por ejemplo, un mes). */
  texto?: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <button type="button" onClick={() => onCambio(Math.max(min, valor - 1))} disabled={valor <= min} aria-label={menos} className="grid size-10 place-items-center rounded-full bg-tarjeta text-[20px] font-semibold disabled:opacity-40">
        -
      </button>
      <span className={`text-center font-semibold tabular-nums ${texto ? "min-w-[5.5rem] text-[15px] capitalize" : "w-8 text-[20px]"}`} aria-live="polite">
        {texto ?? valor}
      </span>
      <button type="button" onClick={() => onCambio(Math.min(max, valor + 1))} disabled={valor >= max} aria-label={mas} className="grid size-10 place-items-center rounded-full bg-tarjeta disabled:opacity-40">
        <Icono trazo={ICONOS.mas} className="size-5" />
      </button>
    </span>
  );
}

