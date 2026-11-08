"use client";

// Tarjetas (pestaña dentro de Pagos): compras en cuotas agrupadas por tarjeta.
// Cada cuota también aparece en Fijos para pagarla; acá se cargan, se editan y se ve
// cuánto va en cada tarjeta. Una tarjeta es solo banco, últimos 4 números y de quién es.

import { LoQueDeben } from "@/components/Deudas";
import { useRef, useState } from "react";
import { Icono, ICONOS } from "@/components/Iconos";
import { Boton, CampoMonto, CampoNombre, Contador, FilaLista, Grupo, Hoja } from "@/components/ui";
import { cuotaDelMes, esCompraEnCuotas, mesesEntre, mesUltimaCuota, pagoFijoVigente, pagosDelMes, restaDeCompra, resumenTarjeta, textoCuota } from "@/lib/calculos";
import { mesCorto, nombreMes, pesos, pesosCortos, sumarMeses } from "@/lib/formato";
import type { NuevaTarjeta, NuevoPagoFijo } from "@/lib/operaciones";
import { useBilletera } from "@/lib/store";
import type { Mes, PagoFijo, Tarjeta } from "@/lib/tipos";

export function nombreTarjeta(t: Pick<Tarjeta, "banco" | "ultimos4">) {
  return `${t.banco} ${t.ultimos4}`;
}

type Edicion = { tipo: "compra"; id: string } | { tipo: "nuevaCompra"; tarjetaId?: string } | { tipo: "tarjeta"; id: string } | { tipo: "nuevaTarjeta" };

const SIN_TARJETA = "";

/** Cómo va una compra en el mes elegido. 0 = tiene cuota, 1 = empieza más adelante, 2 = terminada o de baja. */
function estadoCompra(p: PagoFijo, mes: Mes) {
  return pagoFijoVigente(p, mes) ? 0 : p.activo && p.altaDesde && p.altaDesde > mes ? 1 : 2;
}

function bajadaCompra(p: PagoFijo, mes: Mes): string {
  const ultima = mesUltimaCuota(p);
  if (!p.activo && (!p.bajaDesde || p.bajaDesde <= mes)) return "Dada de baja";
  const cuota = textoCuota(p, mes);
  if (cuota && pagoFijoVigente(p, mes)) return `${cuota}, vence el ${p.dia}`;
  if (p.altaDesde && p.altaDesde > mes) return `${p.cuotas} cuotas desde ${nombreMes(p.altaDesde)}`;
  return ultima ? `Terminó en ${nombreMes(ultima)}` : "Terminada";
}

/** Lo que se ve en el carrusel: una tarjeta, las compras sin tarjeta o el lugar para agregar una. */
type Lugar = { tipo: "tarjeta"; tarjeta: Tarjeta } | { tipo: "sin" } | { tipo: "agregar" };
const claveDe = (l: Lugar) => (l.tipo === "tarjeta" ? l.tarjeta.id : l.tipo);

export function VistaTarjetas() {
  const { datos, mes } = useBilletera();
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [elegida, setElegida] = useState(0);
  // La tarjeta dada vuelta (solo la del centro; al pasar a otra, vuelve sola al frente).
  const [volteada, setVolteada] = useState<string | null>(null);
  const carrusel = useRef<HTMLDivElement>(null);
  const tarjetas = datos.tarjetas ?? [];
  const compras = datos.pagosFijos.filter(esCompraEnCuotas);
  const haySinTarjeta = compras.some((p) => !tarjetas.some((t) => t.id === p.tarjetaId) && estadoCompra(p, mes) < 2);
  const lugares: Lugar[] = [
    ...tarjetas.map((tarjeta) => ({ tipo: "tarjeta" as const, tarjeta })),
    ...(haySinTarjeta ? [{ tipo: "sin" as const }] : []),
    { tipo: "agregar" },
  ];
  const indice = Math.min(elegida, lugares.length - 1);
  const lugar = lugares[indice];
  const totalMes = pagosDelMes(datos, mes)
    .filter((p) => esCompraEnCuotas(p.pagoFijo))
    .reduce((a, p) => a + p.monto, 0);

  // La elegida es la que quedó en el centro al deslizar.
  const alDeslizar = () => {
    const el = carrusel.current;
    const primera = el?.firstElementChild as HTMLElement | null;
    if (!el || !primera) return;
    const paso = primera.offsetWidth + 12;
    const nuevo = Math.max(0, Math.min(lugares.length - 1, Math.round(el.scrollLeft / paso)));
    if (nuevo !== indice) setVolteada(null);
    setElegida(nuevo);
  };
  const irA = (i: number) => {
    const el = carrusel.current;
    const destino = el?.children[i] as HTMLElement | undefined;
    if (!el || !destino) return;
    el.scrollTo({ left: destino.offsetLeft - (el.clientWidth - destino.offsetWidth) / 2, behavior: "smooth" });
    if (i !== indice) setVolteada(null);
    setElegida(i);
  };

  const tarjetaId = lugar.tipo === "tarjeta" ? lugar.tarjeta.id : null;
  const deEsta = lugar.tipo === "agregar" ? [] : compras.filter((p) => (lugar.tipo === "sin" ? !tarjetas.some((t) => t.id === p.tarjetaId) : p.tarjetaId === tarjetaId));
  const porEstado = (e: number) => deEsta.filter((p) => estadoCompra(p, mes) === e).sort((a, b) => a.dia - b.dia);

  const fila = (p: PagoFijo) => {
    const resta = restaDeCompra(datos, p, mes);
    return (
      <FilaLista
        key={p.id}
        titulo={p.concepto}
        bajada={bajadaCompra(p, mes)}
        valor={pesos(p.monto)}
        valorBajada={resta.cuotas > 0 ? `Resta ${pesos(resta.monto)}` : undefined}
        apagada={estadoCompra(p, mes) === 2}
        onClick={() => setEdicion({ tipo: "compra", id: p.id })}
      />
    );
  };

  return (
    <>
      <div className="mx-5 mt-4 flex items-baseline justify-between gap-3">
        <span className="text-[14px] text-tenue">En cuotas en {nombreMes(mes).split(" ")[0]}</span>
        <span className="text-[15px] font-semibold tabular-nums">{pesos(totalMes, { ceroComoGuion: false })}</span>
      </div>

      <div
        ref={carrusel}
        onScroll={alDeslizar}
        className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[8%] pb-14 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Tus tarjetas"
      >
        {lugares.map((l, i) => (
          <PlasticoTarjeta
            key={claveDe(l)}
            lugar={l}
            orden={i}
            elegida={i === indice}
            vuelta={i === indice && volteada === claveDe(l)}
            onClick={() =>
              i !== indice ? irA(i) : l.tipo === "agregar" ? setEdicion({ tipo: "nuevaTarjeta" }) : setVolteada((v) => (v === claveDe(l) ? null : claveDe(l)))
            }
          />
        ))}
      </div>

      {lugares.length > 1 && (
        <div className="-mt-9 flex justify-center">
          <div className="flex items-center gap-1.5 rounded-full superficie px-3 py-2 ring-1 ring-linea">
            {lugares.map((l, i) => (
              <button
                key={i}
                onClick={() => irA(i)}
                aria-label={l.tipo === "tarjeta" ? nombreTarjeta(l.tarjeta) : l.tipo === "sin" ? "Sin tarjeta" : "Agregar tarjeta"}
                aria-current={i === indice}
                className={`h-2 rounded-full transition-[width] duration-200 motion-reduce:transition-none ${i === indice ? "w-6 bg-texto" : "w-2 bg-sutil"}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mx-5 mt-5 flex gap-2.5">
        {lugar.tipo === "agregar" ? (
          <Boton onClick={() => setEdicion({ tipo: "nuevaTarjeta" })}>
            <Icono trazo={ICONOS.mas} className="size-5" />
            Agregar tarjeta
          </Boton>
        ) : (
          <>
            <Boton onClick={() => setEdicion({ tipo: "nuevaCompra", tarjetaId: tarjetaId ?? undefined })}>
              <Icono trazo={ICONOS.mas} className="size-5" />
              Agregar compra
            </Boton>
            {lugar.tipo === "tarjeta" && (
              <Boton variante="secundario" onClick={() => setEdicion({ tipo: "tarjeta", id: lugar.tarjeta.id })}>
                <Icono trazo={ICONOS.lapiz} className="size-5" />
                Editar
              </Boton>
            )}
          </>
        )}
      </div>

      <main className="mt-5 space-y-5">
        <LoQueDeben />
        {lugar.tipo === "agregar" ? (
          <p className="mx-6 text-[14px] leading-5 text-tenue">
            Solo banco, últimos 4 números y de quién es, para reconocerla. Nunca el número completo.
          </p>
        ) : deEsta.length === 0 ? (
          <div className="px-9 py-6 text-center">
            <p className="text-[15px] font-semibold">Sin compras en cuotas</p>
            <p className="mt-1 text-[15px] text-tenue">Cargá la primera con Agregar compra.</p>
          </div>
        ) : (
          <>
            {porEstado(0).length > 0 && <Grupo titulo={`Cuotas de ${nombreMes(mes).split(" ")[0]}`}>{porEstado(0).map(fila)}</Grupo>}
            {porEstado(1).length > 0 && <Grupo titulo="Empiezan más adelante">{porEstado(1).map(fila)}</Grupo>}
            {porEstado(2).length > 0 && <Grupo titulo="Terminadas">{porEstado(2).map(fila)}</Grupo>}
            <p className="mx-6 text-[13px] leading-5 text-tenue">Las cuotas se pagan desde Fijos, junto con el resto.</p>
          </>
        )}
      </main>

      <HojaTarjetas edicion={edicion} alCerrar={() => setEdicion(null)} />
    </>
  );
}

/**
 * La tarjeta como plástico, al estilo de las billeteras: banco y de quién es arriba, chip y
 * contactless, lo del mes en grande y abajo los últimos 4 y lo que resta. Flota con sombra
 * (clases `plastico` en globals.css). Se alternan verde y grafito para distinguirlas.
 * La del centro, al tocarla, se da vuelta con el mismo giro que Reparto (`.giro`) y muestra
 * lo de cada mes en barras.
 */
function PlasticoTarjeta({ lugar, orden, elegida, vuelta, onClick }: { lugar: Lugar; orden: number; elegida: boolean; vuelta: boolean; onClick: () => void }) {
  const { datos, mes } = useBilletera();
  const base = `aspect-[1.586] w-[84%] shrink-0 snap-center overflow-hidden rounded-[20px] px-[18px] pb-4 pt-[18px] text-left transition-[opacity,transform] duration-200 motion-reduce:transition-none ${elegida ? "" : "scale-[0.94] opacity-70"}`;

  if (lugar.tipo === "agregar") {
    return (
      <button onClick={onClick} className={`${base} flex flex-col items-center justify-center gap-2 border-[1.5px] border-dashed border-sutil text-marca`}>
        <span className="grid size-11 place-items-center rounded-full bg-marca-suave">
          <Icono trazo={ICONOS.mas} className="size-5" />
        </span>
        <span className="text-[15px] font-semibold">Agregar tarjeta</span>
      </button>
    );
  }

  const tarjeta = lugar.tipo === "tarjeta" ? lugar.tarjeta : null;
  const r = resumenTarjeta(datos, tarjeta?.id ?? null, mes);
  const duenio = tarjeta ? datos.miembros.find((m) => m.id === tarjeta.miembroId)?.nombre : null;
  const estilo = !tarjeta ? "superficie text-texto shadow-tarjeta ring-1 ring-linea" : `plastico ${orden % 2 === 0 ? "plastico-verde" : "plastico-grafito"}`;
  const cara = `absolute inset-0 flex flex-col overflow-hidden rounded-[20px] px-[18px] pb-4 pt-[18px] ${estilo}`;
  const nombre = tarjeta ? `${nombreTarjeta(tarjeta)}, de ${duenio}` : "Compras sin tarjeta";

  return (
    <button
      onClick={onClick}
      aria-pressed={elegida ? vuelta : undefined}
      aria-label={elegida ? (vuelta ? `${nombre}: lo de cada mes. Tocá para volver` : `${nombre}. Tocá para ver lo de cada mes`) : nombre}
      className={`giro block aspect-[1.586] w-[84%] shrink-0 snap-center text-left transition-[opacity,transform] duration-200 motion-reduce:transition-none ${elegida ? "" : "scale-[0.94] opacity-70"}`}
    >
      <span className="giro-interior relative block size-full" data-dada-vuelta={vuelta}>
        <span className={cara} aria-hidden={vuelta}>
          <FrenteTarjeta tarjeta={tarjeta} duenio={duenio} r={r} />
        </span>
        <span className={cara} aria-hidden={!vuelta}>
          <DorsoTarjeta tarjeta={tarjeta} />
        </span>
      </span>
    </button>
  );
}

function FrenteTarjeta({ tarjeta, duenio, r }: { tarjeta: Tarjeta | null; duenio?: string | null; r: ReturnType<typeof resumenTarjeta> }) {
  return (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[17px] font-bold tracking-[-0.01em]">{tarjeta ? tarjeta.banco : "Sin tarjeta"}</span>
        {duenio && (
          <span className="shrink-0 rounded-full bg-current/15 px-2.5 py-[3px] text-[12px] font-semibold ring-1 ring-current/20 backdrop-blur-sm">{duenio}</span>
        )}
      </span>
      <span className="mt-3 flex items-center gap-2.5" aria-hidden>
        {tarjeta && (
          <>
            <Chip />
            <svg viewBox="0 0 24 24" className="size-[18px] rotate-90 opacity-70" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M8.5 16.5a6 6 0 0 1 7 0M6 13.5a10 10 0 0 1 12 0M3.5 10.5a14 14 0 0 1 17 0" />
            </svg>
          </>
        )}
        {/* Pista: al tocarla se da vuelta y muestra las barras por mes. */}
        <span className="ml-auto grid size-7 place-items-center rounded-full bg-current/15">
          <Icono trazo={ICONOS.categorias} className="size-[14px]" />
        </span>
      </span>
      <span className="mt-auto flex items-end justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-[11px] font-medium opacity-70">Este mes</span>
          <span className="block text-[24px] font-bold leading-tight tracking-[-0.02em] tabular-nums">{pesos(r.delMes, { ceroComoGuion: false })}</span>
        </span>
        <span className="shrink-0 text-right leading-tight">
          <span className="block text-[11px] font-medium opacity-70">Resta</span>
          <span className="block text-[15px] font-semibold tabular-nums">{r.resta > 0 ? pesos(r.resta) : "Nada"}</span>
        </span>
      </span>
      <span className="mt-2.5 flex items-center justify-between gap-2 text-[12px]">
        <span className="font-medium tracking-[0.18em] opacity-85 tabular-nums">{tarjeta ? `•••• ${tarjeta.ultimos4}` : ""}</span>
        {r.resta > 0 && r.hasta && <span className="opacity-70">hasta {nombreMes(r.hasta)}</span>}
      </span>
    </>
  );
}

const MESES_DORSO = 6;

/**
 * Dorso: lo que se paga con la tarjeta en cada uno de los próximos meses (desde el elegido),
 * en barras. Así se ve cuándo baja la cuota. Usa lo mismo que el frente (`resumenTarjeta`).
 */
function DorsoTarjeta({ tarjeta }: { tarjeta: Tarjeta | null }) {
  const { datos, mes } = useBilletera();
  const meses = Array.from({ length: MESES_DORSO }, (_, i) => sumarMeses(mes, i));
  const montos = meses.map((m) => resumenTarjeta(datos, tarjeta?.id ?? null, m).delMes);
  const maximo = Math.max(...montos, 1);
  return (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[15px] font-bold">{tarjeta ? nombreTarjeta(tarjeta) : "Sin tarjeta"}</span>
        <span className="shrink-0 text-[11px] font-medium opacity-70">Por mes</span>
      </span>
      <span className="mt-2 flex min-h-0 flex-1 items-end gap-2">
        {meses.map((m, i) => {
          const monto = montos[i];
          return (
            <span key={m} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <span className={`mb-1 whitespace-nowrap text-[10px] font-semibold tabular-nums ${i === 0 ? "" : "opacity-75"}`}>{monto > 0 ? pesosCortos(monto) : "–"}</span>
              <span
                className={`w-full max-w-[24px] rounded-[6px] bg-current ${i === 0 ? "opacity-95" : monto > 0 ? "opacity-45" : "opacity-20"}`}
                style={{ height: monto > 0 ? `${Math.max((monto / maximo) * 72, 6)}%` : "3px" }}
              />
              <span className={`mt-1.5 text-[11px] ${i === 0 ? "font-semibold" : "opacity-70"}`}>{mesCorto(m)}</span>
            </span>
          );
        })}
      </span>
    </>
  );
}

/** Chip de la tarjeta: metálico claro, hecho con el color del texto de la tarjeta. */
function Chip() {
  return (
    <svg viewBox="0 0 34 26" className="h-[22px] w-[29px]" aria-hidden>
      <defs>
        <linearGradient id="chip-brillo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="currentColor" stopOpacity="0.45" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.65" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="33" height="25" rx="5" fill="url(#chip-brillo)" />
      <path d="M0.5 9h10M0.5 17h10M23.5 9h10M23.5 17h10M10.5 0.5v25M23.5 0.5v25M10.5 13h13" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" fill="none" />
    </svg>
  );
}

function HojaTarjetas({ edicion, alCerrar }: { edicion: Edicion | null; alCerrar: () => void }) {
  const { datos, mes, actualizarPagoFijo, agregarPagoFijo, agregarTarjeta, actualizarTarjeta, borrarTarjeta } = useBilletera();
  const compra = edicion?.tipo === "compra" ? datos.pagosFijos.find((p) => p.id === edicion.id) : undefined;
  const tarjeta = edicion?.tipo === "tarjeta" ? datos.tarjetas?.find((t) => t.id === edicion.id) : undefined;
  const titulo =
    edicion?.tipo === "nuevaCompra"
      ? "Nueva compra en cuotas"
      : edicion?.tipo === "compra"
        ? "Editar compra en cuotas"
        : edicion?.tipo === "nuevaTarjeta"
          ? "Nueva tarjeta"
          : "Editar tarjeta";

  return (
    <Hoja abierta={edicion !== null} alCerrar={alCerrar} titulo={titulo} mostrarTitulo>
      {(edicion?.tipo === "nuevaCompra" || compra) && (
        <FormularioCompra
          key={compra ? `compra-${compra.id}` : `nueva-${edicion?.tipo === "nuevaCompra" ? (edicion.tarjetaId ?? "") : ""}`}
          compra={compra}
          tarjetaInicial={edicion?.tipo === "nuevaCompra" ? edicion.tarjetaId : undefined}
          alGuardar={(nueva, tarjetaNueva) => {
            const tarjetaId = tarjetaNueva ? agregarTarjeta(tarjetaNueva) : nueva.tarjetaId ?? null;
            if (compra) {
              actualizarPagoFijo(compra.id, {
                concepto: nueva.concepto,
                monto: nueva.monto,
                dia: nueva.dia,
                cuotas: nueva.cuotas,
                altaDesde: nueva.primeraCuota,
                tarjetaId,
              });
            } else {
              agregarPagoFijo({ ...nueva, tarjetaId });
            }
            alCerrar();
          }}
          alDarDeBaja={
            compra
              ? () => {
                  actualizarPagoFijo(compra.id, { activo: false, bajaDesde: mes });
                  alCerrar();
                }
              : undefined
          }
        />
      )}
      {(edicion?.tipo === "nuevaTarjeta" || tarjeta) && (
        <FormularioTarjeta
          key={tarjeta ? `tarjeta-${tarjeta.id}` : "nueva-tarjeta"}
          tarjeta={tarjeta}
          alGuardar={(t) => {
            if (tarjeta) actualizarTarjeta(tarjeta.id, t);
            else agregarTarjeta(t);
            alCerrar();
          }}
          alBorrar={
            tarjeta
              ? () => {
                  borrarTarjeta(tarjeta.id);
                  alCerrar();
                }
              : undefined
          }
        />
      )}
    </Hoja>
  );
}

/** Banco, últimos 4 y de quién es. Se usa sola o dentro de una compra (tarjeta nueva al toque). */
function CamposTarjeta({ valor, onCambio }: { valor: NuevaTarjeta; onCambio: (t: NuevaTarjeta) => void }) {
  const { datos } = useBilletera();
  return (
    <div className="divide-y divide-linea rounded-2xl bg-relleno">
      <label className="flex min-h-14 items-center gap-3 px-4">
        <span className="shrink-0 text-[15px] font-medium">Banco</span>
        <input
          value={valor.banco}
          onChange={(e) => onCambio({ ...valor, banco: e.target.value })}
          placeholder="Por ejemplo, Galicia"
          className="min-w-0 flex-1 bg-transparent text-right text-[16px] font-medium outline-none placeholder:text-sutil"
        />
      </label>
      <label className="flex min-h-14 items-center gap-3 px-4">
        <span className="shrink-0 text-[15px] font-medium">Últimos 4 números</span>
        <input
          value={valor.ultimos4}
          onChange={(e) => onCambio({ ...valor, ultimos4: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          inputMode="numeric"
          placeholder="1234"
          className="min-w-0 flex-1 bg-transparent text-right text-[16px] font-medium tabular-nums outline-none placeholder:text-sutil"
        />
      </label>
      <div className="px-4 py-3">
        <span className="block text-[15px] font-medium">De quién es</span>
        <div className="mt-2 grid grid-cols-2 rounded-full bg-tarjeta p-1" role="radiogroup" aria-label="De quién es">
          {datos.miembros.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={valor.miembroId === m.id}
              onClick={() => onCambio({ ...valor, miembroId: m.id })}
              className="h-10 rounded-full text-[14px] font-semibold text-tenue aria-checked:bg-marca aria-checked:text-sobre-marca"
            >
              {m.nombre}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const tarjetaValida = (t: NuevaTarjeta) => t.banco.trim() !== "" && /^\d{4}$/.test(t.ultimos4) && t.miembroId !== "";

function FormularioTarjeta({ tarjeta, alGuardar, alBorrar }: { tarjeta?: Tarjeta; alGuardar: (t: NuevaTarjeta) => void; alBorrar?: () => void }) {
  const { usuarioId, datos } = useBilletera();
  const [valor, setValor] = useState<NuevaTarjeta>({
    banco: tarjeta?.banco ?? "",
    ultimos4: tarjeta?.ultimos4 ?? "",
    miembroId: tarjeta?.miembroId ?? usuarioId,
  });
  const compras = tarjeta ? datos.pagosFijos.filter((p) => p.tarjetaId === tarjeta.id).length : 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (tarjetaValida(valor)) alGuardar(valor);
      }}
    >
      <CamposTarjeta valor={valor} onCambio={setValor} />
      <div className="mt-6">
        <Boton type="submit" disabled={!tarjetaValida(valor)}>
          {tarjeta ? "Guardar" : "Agregar"}
        </Boton>
      </div>
      {tarjeta && alBorrar && (
        <div className="mt-3">
          <Boton
            type="button"
            variante="peligro"
            onClick={() =>
              confirm(
                compras > 0
                  ? `¿Borrar ${nombreTarjeta(tarjeta)}? Sus ${compras} ${compras === 1 ? "compra queda" : "compras quedan"} sin tarjeta, no se borran.`
                  : `¿Borrar ${nombreTarjeta(tarjeta)}?`,
              ) && alBorrar()
            }
          >
            Borrar tarjeta
          </Boton>
        </div>
      )}
    </form>
  );
}

const NUEVA = "__nueva__";

/**
 * Compra en cuotas. Nueva: qué es, valor total, cuántas cuotas, día, en qué mes cae la primera
 * (por defecto el siguiente, como llega en el resumen) y con qué tarjeta. Va siempre a Deuda.
 * Ya cargada: se puede corregir todo; acá el monto es el de cada cuota. Las cuotas ya pagadas
 * no cambian (guardan su monto y siguen apareciendo en su mes).
 */
function FormularioCompra({
  compra,
  tarjetaInicial,
  alGuardar,
  alDarDeBaja,
}: {
  compra?: PagoFijo;
  /** Compra nueva desde una tarjeta del carrusel: ya viene elegida. */
  tarjetaInicial?: string;
  alGuardar: (pago: NuevoPagoFijo & { primeraCuota: Mes }, tarjetaNueva?: NuevaTarjeta) => void;
  alDarDeBaja?: () => void;
}) {
  const { datos, mes, usuarioId } = useBilletera();
  const deuda = datos.categorias.find((c) => c.nombre === "Deuda");
  const tarjetas = datos.tarjetas ?? [];
  const siguiente = sumarMeses(mes, 1);
  const [concepto, setConcepto] = useState(compra?.concepto ?? "");
  // Nueva: el valor total. Ya cargada: el valor de cada cuota.
  const [monto, setMonto] = useState(compra?.monto ?? 0);
  const [cuotas, setCuotas] = useState(compra?.cuotas ?? 6);
  const [dia, setDia] = useState(compra?.dia ?? 10);
  const [primera, setPrimera] = useState<Mes>(compra?.altaDesde ?? siguiente);
  const [tarjetaId, setTarjetaId] = useState<string>(compra ? (compra.tarjetaId ?? SIN_TARJETA) : (tarjetaInicial ?? tarjetas.find((t) => t.miembroId === usuarioId)?.id ?? tarjetas[0]?.id ?? NUEVA));
  const [nueva, setNueva] = useState<NuevaTarjeta>({ banco: "", ultimos4: "", miembroId: usuarioId });

  const porCuota = compra ? monto : Math.round((monto / cuotas) * 100) / 100;
  const conTarjetaNueva = tarjetaId === NUEVA;
  const valido = concepto.trim() !== "" && monto > 0 && !!deuda && (!conTarjetaNueva || tarjetaValida(nueva));
  const ultima = sumarMeses(primera, cuotas - 1);
  const cuotaHoy = compra ? cuotaDelMes({ ...compra, cuotas, altaDesde: primera }, mes) : null;
  // Las cuotas que ya se pagaron no se pueden sacar: como mínimo, hasta la última pagada.
  const pagadas = compra ? datos.pagosMes.filter((p) => p.pagoFijoId === compra.id && p.pagado).map((p) => p.mes) : [];
  const minCuotas = Math.max(1, ...pagadas.map((m) => mesesEntre(primera, m) + 1));
  const desplazamiento = mesesEntre(mes, primera);

  const guardar = () => {
    if (!valido || !deuda) return;
    alGuardar(
      {
        concepto: concepto.trim(),
        monto: porCuota,
        dia,
        categoriaId: deuda.id,
        esDeuda: true,
        cuotas: Math.max(cuotas, minCuotas),
        primeraCuota: primera,
        tarjetaId: conTarjetaNueva || tarjetaId === SIN_TARJETA ? null : tarjetaId,
      },
      conTarjetaNueva ? nueva : undefined,
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <CampoNombre etiqueta="Qué compraste" valor={concepto} onCambio={setConcepto} placeholder="Por ejemplo, Heladera" autoFocus={!compra} />
      <p className="mt-4 text-[14px] leading-5 text-tenue">
        {compra ? "El valor de cada cuota. Las ya pagadas no cambian." : "El valor total de la compra. Se divide en las cuotas."}
      </p>
      <div className="py-8">
        <CampoMonto valor={monto} onCambio={setMonto} onEnter={guardar} lapiz />
        {!compra && monto > 0 && (
          <p className="mt-2 text-center text-[14px] text-tenue">
            {cuotas} {cuotas === 1 ? "cuota" : "cuotas"} de {pesos(porCuota, { ceroComoGuion: false })}
          </p>
        )}
      </div>

      <div className="mb-6 divide-y divide-linea rounded-2xl bg-relleno">
        <div className="flex min-h-14 items-center justify-between px-4 py-3">
          <span className="text-[15px] font-medium">Cuotas</span>
          <Contador valor={cuotas} min={minCuotas} max={120} onCambio={setCuotas} menos="Una cuota menos" mas="Una cuota más" />
        </div>
        <div className="px-4 py-3">
          <div className="flex min-h-10 items-center justify-between gap-3">
            <span className="text-[15px] font-medium">Primera cuota</span>
            {compra ? (
              <Contador
                valor={desplazamiento}
                min={-36}
                max={12}
                onCambio={(n) => setPrimera(sumarMeses(mes, n))}
                menos="Un mes antes"
                mas="Un mes después"
                texto={`${mesCorto(primera)} ${primera.slice(0, 4)}`}
              />
            ) : null}
          </div>
          {!compra && (
            <div className="mt-2 grid grid-cols-2 rounded-full bg-tarjeta p-1" role="radiogroup" aria-label="Primera cuota">
              {[mes, siguiente].map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={primera === m}
                  onClick={() => setPrimera(m)}
                  className="h-10 rounded-full text-[14px] font-semibold capitalize text-tenue aria-checked:bg-marca aria-checked:text-sobre-marca"
                >
                  {nombreMes(m)}
                </button>
              ))}
            </div>
          )}
          <span className="mt-2 block text-[13px] text-tenue">
            {cuotaHoy && cuotaHoy.numero >= 1 && cuotaHoy.numero <= cuotaHoy.total ? `En ${nombreMes(mes)} va la ${cuotaHoy.numero} de ${cuotaHoy.total}. ` : ""}
            La última, en {nombreMes(ultima)}.
          </span>
        </div>
        <div className="flex min-h-14 items-center justify-between px-4 py-3">
          <span>
            <span className="block text-[15px] font-medium">Vence el día</span>
            <span className="block text-[13px] text-tenue">Del resumen de la tarjeta</span>
          </span>
          <Contador valor={dia} min={1} max={31} onCambio={setDia} menos="Un día antes" mas="Un día después" />
        </div>
        <label className="flex min-h-14 items-center gap-3 px-4">
          <span className="shrink-0 text-[15px] font-medium">Tarjeta</span>
          <select
            value={tarjetaId}
            onChange={(e) => setTarjetaId(e.target.value)}
            className="min-w-0 flex-1 appearance-none bg-transparent text-right text-[16px] font-medium outline-none"
          >
            {tarjetas.map((t) => (
              <option key={t.id} value={t.id}>
                {nombreTarjeta(t)}, de {datos.miembros.find((m) => m.id === t.miembroId)?.nombre}
              </option>
            ))}
            <option value={NUEVA}>Nueva tarjeta</option>
            <option value={SIN_TARJETA}>Sin tarjeta</option>
          </select>
          <Icono trazo={ICONOS.lapiz} className="size-4 shrink-0 text-sutil" />
        </label>
        <div className="flex min-h-14 items-center justify-between gap-3 px-4">
          <span>
            <span className="block text-[15px] font-medium">Categoría</span>
            <span className="block text-[13px] text-tenue">Se suma sola al techo de Deuda</span>
          </span>
          <span className="text-[15px] text-tenue">{deuda?.nombre ?? "Falta la categoría Deuda"}</span>
        </div>
      </div>

      {conTarjetaNueva && (
        <div className="mb-6">
          <p className="mb-2 px-1 text-[13px] text-tenue">Tarjeta nueva</p>
          <CamposTarjeta valor={nueva} onCambio={setNueva} />
        </div>
      )}

      <Boton type="submit" disabled={!valido}>
        {compra ? "Guardar" : "Agregar"}
      </Boton>

      {compra && alDarDeBaja && compra.activo && pagoFijoVigente(compra, mes) && (
        <div className="mt-3">
          <Boton
            type="button"
            variante="peligro"
            onClick={() => confirm(`¿Dar de baja esta compra desde ${nombreMes(mes)}? Deja de aparecer en Pagos. Los meses anteriores no cambian.`) && alDarDeBaja()}
          >
            Dar de baja
          </Boton>
          <p className="mt-2 text-center text-[13px] text-tenue">Por ejemplo, si la cancelaste antes. Cuando termina, se va sola.</p>
        </div>
      )}
    </form>
  );
}
