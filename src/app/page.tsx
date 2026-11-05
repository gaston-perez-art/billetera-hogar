"use client";

import Link from "next/link";
import { useState } from "react";
import { Icono, IconoCategoria, ICONOS } from "@/components/Iconos";
import { BotonAjustes, Hoja, MontoGrande, SelectorMes, SelectorUsuario, TituloBloque } from "@/components/ui";
import { movimientosDelMes, pagosDelMes, resumenMes, totalSantino } from "@/lib/calculos";
import { etiquetaDia, fechaCorta, mesCorto, pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";
import type { Movimiento } from "@/lib/tipos";

export default function Inicio() {
  const { datos, mes, usuarioId, borrarMovimiento } = useBilletera();
  const [abierto, setAbierto] = useState<Movimiento | null>(null);
  const r = resumenMes(datos, mes);
  const pendientes = pagosDelMes(datos, mes).filter((p) => !p.pagado);
  const movimientos = movimientosDelMes(datos, mes);
  const santino = totalSantino(datos, mes);
  const categoria = (id: string) => datos.categorias.find((c) => c.id === id)?.nombre ?? "";
  const miembro = (id: string) => datos.miembros.find((m) => m.id === id)?.nombre ?? "";

  // Actividad agrupada por día, más reciente primero.
  const porDia = new Map<string, Movimiento[]>();
  for (const m of [...movimientos].sort((a, b) => (b.fecha + b.creadoEn).localeCompare(a.fecha + a.creadoEn))) {
    porDia.set(m.fecha, [...(porDia.get(m.fecha) ?? []), m]);
  }

  return (
    <>
      {/* Saldo: el bloque oscuro de arriba. */}
      <header className="bg-bosque px-5 pb-16 pt-[max(env(safe-area-inset-top),1.25rem)] text-white">
        <div className="flex items-center justify-between gap-3">
          <SelectorUsuario oscuro />
          <SelectorMes oscuro />
          <BotonAjustes oscuro />
        </div>

        <p className="mt-9 text-[15px] text-white/70">Te queda de verdad</p>
        <MontoGrande monto={r.teQueda} className={`mt-1 text-[52px] leading-none ${r.teQueda < 0 ? "text-[#ffb4a4]" : ""}`} />

        <Reparto entra={r.entra} gastado={r.gastado} faltan={r.faltan} queda={r.teQueda} />

        <div className="mt-7 grid grid-cols-2 gap-3">
          <Link href="/cargar" className="flex items-center justify-center gap-2 rounded-full bg-white py-3.5 font-bold text-bosque transition active:scale-[0.98]">
            <Icono trazo={ICONOS.mas} className="size-5" />
            Cargar gasto
          </Link>
          <Link href="/pagos" className="flex items-center justify-center gap-2 rounded-full bg-white/12 py-3.5 font-bold text-white ring-1 ring-white/15 transition active:scale-[0.98]">
            <Icono trazo={ICONOS.pagos} className="size-5" />
            Pagos fijos
          </Link>
        </div>
      </header>

      {/* Contenido sobre una lámina clara que pisa el bloque oscuro. */}
      <main className="relative -mt-8 space-y-7 rounded-t-[32px] bg-fondo px-4 pt-6">
        {pendientes.length > 0 && (
          <section>
            <TituloBloque href="/pagos" accion="Ver todos">Por pagar este mes</TituloBloque>
            <ul className="sin-barra -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
              {pendientes.map((p) => (
                <li key={p.pagoFijo.id} className="w-40 shrink-0 snap-start rounded-3xl bg-tarjeta p-4">
                  <div className="flex items-start justify-between">
                    <IconoCategoria nombre={categoria(p.pagoFijo.categoriaId)} tamano="sm" />
                    <span className="rounded-full bg-fondo px-2 py-0.5 text-xs font-semibold text-tenue">
                      {p.pagoFijo.dia} {mesCorto(mes)}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-10 text-sm font-semibold leading-5">{p.pagoFijo.concepto}</p>
                  <p className="mt-1 font-bold tabular-nums">{pesos(p.monto)}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {santino !== 0 && (
          <Link href="/categorias" className="flex items-center gap-3 rounded-3xl bg-tarjeta p-4">
            <IconoCategoria nombre="Santino" />
            <div className="flex-1">
              <p className="font-semibold">Gastos de Santino</p>
              <p className="text-sm text-tenue">En lo que va del mes</p>
            </div>
            <span className="font-bold tabular-nums">{pesos(santino)}</span>
          </Link>
        )}

        <section>
          <TituloBloque>Actividad</TituloBloque>
          {movimientos.length === 0 ? (
            <div className="rounded-3xl bg-tarjeta px-6 py-10 text-center">
              <p className="font-semibold">Todavía no hay gastos este mes</p>
              <p className="mt-1 text-sm text-tenue">Cargá el primero con el botón + de abajo.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {[...porDia].map(([fecha, lista]) => (
                <div key={fecha}>
                  <h3 className="mb-1.5 px-1 text-sm font-semibold text-tenue">{etiquetaDia(fecha)}</h3>
                  <ul className="overflow-hidden rounded-3xl bg-tarjeta">
                    {lista.map((m, i) => (
                      <li key={m.id}>
                        <button
                          onClick={() => setAbierto(m)}
                          className={`flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-fondo ${i > 0 ? "border-t border-linea" : ""}`}
                        >
                          <IconoCategoria nombre={categoria(m.categoriaId)} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{m.detalle || categoria(m.categoriaId)}</span>
                            <span className="block truncate text-sm text-tenue">
                              {categoria(m.categoriaId)}
                              {m.pagoPor !== usuarioId && `, pagó ${miembro(m.pagoPor)}`}
                            </span>
                          </span>
                          <span className={`shrink-0 font-bold tabular-nums ${m.monto < 0 ? "text-queda" : ""}`}>
                            {m.monto < 0 ? `+${pesos(-m.monto)}` : `−${pesos(m.monto)}`}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Hoja abierta={abierto !== null} alCerrar={() => setAbierto(null)} titulo="Detalle del gasto">
        {abierto && (
          <div>
            <div className="flex flex-col items-center text-center">
              <IconoCategoria nombre={categoria(abierto.categoriaId)} tamano="lg" />
              <p className="mt-3 text-sm text-tenue">{categoria(abierto.categoriaId)}</p>
              <MontoGrande monto={Math.abs(abierto.monto)} className={`mt-1 text-4xl ${abierto.monto < 0 ? "text-queda" : ""}`} />
              {abierto.detalle && <p className="mt-2 font-semibold">{abierto.detalle}</p>}
            </div>
            <dl className="mt-6 divide-y divide-linea rounded-3xl bg-fondo px-4">
              <DatoHoja etiqueta="Fecha" valor={fechaCorta(abierto.fecha)} />
              <DatoHoja etiqueta="Pagó" valor={miembro(abierto.pagoPor)} />
              {abierto.medio && <DatoHoja etiqueta="Medio de pago" valor={abierto.medio} />}
              {abierto.monto < 0 && <DatoHoja etiqueta="Tipo" valor="Plata que entra" />}
            </dl>
            <button
              onClick={() => {
                if (confirm(`¿Borrar "${abierto.detalle || "este gasto"}"?`)) {
                  borrarMovimiento(abierto.id);
                  setAbierto(null);
                }
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-pasaste-suave py-3.5 font-bold text-pasaste"
            >
              <Icono trazo={ICONOS.basura} className="size-5" />
              Borrar gasto
            </button>
          </div>
        )}
      </Hoja>
    </>
  );
}

/** Barra de en qué se va lo que entra: gastado, pagos que faltan y lo que queda. */
function Reparto({ entra, gastado, faltan, queda }: { entra: number; gastado: number; faltan: number; queda: number }) {
  const total = Math.max(entra, gastado + faltan, 1);
  const tramos = [
    { nombre: "Gastado", monto: gastado, color: "bg-white" },
    { nombre: "Por pagar", monto: faltan, color: "bg-[#e9c46a]" },
    { nombre: "Queda", monto: Math.max(queda, 0), color: "bg-menta" },
  ];
  return (
    <div className="mt-7">
      <div className="flex h-2.5 gap-1" role="img" aria-label={`De ${pesos(entra)} que entran: ${tramos.map((t) => `${t.nombre.toLowerCase()} ${pesos(t.monto)}`).join(", ")}`}>
        {tramos.map((t) =>
          t.monto > 0 ? <span key={t.nombre} className={`rounded-full ${t.color}`} style={{ width: `${(t.monto / total) * 100}%` }} /> : null,
        )}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {tramos.map((t) => (
          <div key={t.nombre}>
            <dt className="flex items-center gap-1.5 text-xs text-white/65">
              <span className={`size-2 rounded-full ${t.color}`} />
              {t.nombre}
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums">{pesos(t.monto)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-white/55">De {pesos(entra)} que entran este mes.</p>
    </div>
  );
}

function DatoHoja({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-tenue">{etiqueta}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  );
}
