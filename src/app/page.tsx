"use client";

import Link from "next/link";
import { useState } from "react";
import { Icono, IconoCategoria, ICONOS } from "@/components/Iconos";
import { Boton, Dato, Encabezado, Fecha, FilaLista, Grupo, Hoja, MontoGrande } from "@/components/ui";
import { movimientosDelMes, pagosDelMes, resumenMes } from "@/lib/calculos";
import { etiquetaDia, fechaCorta, mesCorto, pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";
import type { Movimiento } from "@/lib/tipos";

export default function Inicio() {
  const { datos, mes, usuarioId, borrarMovimiento } = useBilletera();
  const [abierto, setAbierto] = useState<Movimiento | null>(null);
  const r = resumenMes(datos, mes);
  const pendientes = pagosDelMes(datos, mes).filter((p) => !p.pagado);
  const movimientos = movimientosDelMes(datos, mes);
  const categoria = (id: string) => datos.categorias.find((c) => c.id === id)?.nombre ?? "";
  const miembro = (id: string) => datos.miembros.find((m) => m.id === id)?.nombre ?? "";

  const porDia = new Map<string, Movimiento[]>();
  for (const m of [...movimientos].sort((a, b) => (b.fecha + b.creadoEn).localeCompare(a.fecha + a.creadoEn))) {
    porDia.set(m.fecha, [...(porDia.get(m.fecha) ?? []), m]);
  }

  return (
    <>
      {/* Bloque de saldo: el único lugar oscuro de la app. */}
      <div className="bg-marca-oscura pb-6 text-white">
        <Encabezado oscuro />
        <section className="px-5 pt-4">
          <p className="flex items-center gap-2 text-[15px] text-white/65">
            <span className="size-2 rounded-full bg-acento" />
            Te queda este mes
          </p>
          <MontoGrande monto={r.teQueda} className={`mt-1 text-[48px] leading-[1.05] ${r.teQueda < 0 ? "text-[#ffb3a7]" : ""}`} />
          <Proporcion gastado={r.gastado} faltan={r.faltan} queda={r.teQueda} />
          <dl className="mt-3 grid grid-cols-3 gap-3">
            <Cifra etiqueta="Gastado" valor={r.gastado} punto="bg-white" />
            <Cifra etiqueta="Por pagar" valor={r.faltan} punto="bg-white/35" />
            <Cifra etiqueta="Entra" valor={r.entra} />
          </dl>
          <Link
            href="/cargar"
            className="mt-6 flex h-[52px] items-center justify-center gap-2 rounded-xl bg-white text-[16px] font-semibold text-marca-oscura active:opacity-85"
          >
            <Icono trazo={ICONOS.mas} className="size-5" />
            Cargar gasto
          </Link>
        </section>
      </div>

      <main className="space-y-8 pt-6">
        {pendientes.length > 0 && (
          <Grupo titulo="Próximos pagos" accion={{ texto: "Ver todos", href: "/pagos" }}>
            {pendientes.slice(0, 3).map((p) => (
              <FilaLista
                key={p.pagoFijo.id}
                icono={<Fecha dia={p.pagoFijo.dia} mes={mesCorto(mes)} />}
                titulo={p.pagoFijo.concepto}
                valor={pesos(p.monto)}
              />
            ))}
          </Grupo>
        )}

        {movimientos.length === 0 ? (
          <div className="px-9 py-10 text-center">
            <p className="text-[15px] font-semibold">Sin gastos este mes</p>
            <p className="mt-1 text-[15px] text-tenue">Lo que cargues va a aparecer acá.</p>
          </div>
        ) : (
          [...porDia].map(([fecha, lista]) => (
            <Grupo key={fecha} titulo={etiquetaDia(fecha)}>
              {lista.map((m) => (
                <FilaLista
                  key={m.id}
                  onClick={() => setAbierto(m)}
                  icono={<IconoCategoria nombre={categoria(m.categoriaId)} entra={m.monto < 0} />}
                  titulo={m.detalle || categoria(m.categoriaId)}
                  bajada={m.pagoPor === usuarioId ? categoria(m.categoriaId) : `${categoria(m.categoriaId)}, pagó ${miembro(m.pagoPor)}`}
                  valor={m.monto < 0 ? <span className="text-queda">+{pesos(-m.monto)}</span> : pesos(m.monto)}
                />
              ))}
            </Grupo>
          ))
        )}
      </main>

      <Hoja abierta={abierto !== null} alCerrar={() => setAbierto(null)} titulo="Detalle del gasto">
        {abierto && (
          <>
            <div className="flex items-center gap-3">
              <IconoCategoria nombre={categoria(abierto.categoriaId)} tamano="lg" entra={abierto.monto < 0} />
              <div className="min-w-0">
                <p className="truncate text-[17px] font-semibold">{abierto.detalle || categoria(abierto.categoriaId)}</p>
                <p className="text-[15px] text-tenue">{categoria(abierto.categoriaId)}</p>
              </div>
            </div>
            <MontoGrande monto={Math.abs(abierto.monto)} className={`mt-5 text-[36px] leading-none ${abierto.monto < 0 ? "text-queda" : ""}`} />
            <dl className="mt-4 divide-y divide-linea border-y border-linea">
              <Dato etiqueta="Fecha" valor={fechaCorta(abierto.fecha)} />
              <Dato etiqueta="Pagó" valor={miembro(abierto.pagoPor)} />
              {abierto.medio && <Dato etiqueta="Medio de pago" valor={abierto.medio} />}
              {abierto.monto < 0 && <Dato etiqueta="Tipo" valor="Plata que entra" />}
            </dl>
            <Boton
              variante="peligro"
              className="mt-6"
              onClick={() => {
                if (confirm(`¿Borrar "${abierto.detalle || "este gasto"}"?`)) {
                  borrarMovimiento(abierto.id);
                  setAbierto(null);
                }
              }}
            >
              Borrar gasto
            </Boton>
          </>
        )}
      </Hoja>
    </>
  );
}

function Cifra({ etiqueta, valor, punto }: { etiqueta: string; valor: number; punto?: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[13px] text-white/60">
        {punto && <span className={`size-1.5 rounded-full ${punto}`} />}
        {etiqueta}
      </dt>
      <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{pesos(valor)}</dd>
    </div>
  );
}

/** Barra fina de cómo se reparte lo que entra: gastado, por pagar y lo que queda. */
function Proporcion({ gastado, faltan, queda }: { gastado: number; faltan: number; queda: number }) {
  const total = Math.max(gastado + faltan + Math.max(queda, 0), 1);
  const tramos = [
    { monto: gastado, clase: "bg-white" },
    { monto: faltan, clase: "bg-white/35" },
    { monto: Math.max(queda, 0), clase: "bg-acento" },
  ];
  return (
    <div className="mt-5 flex h-1.5 gap-1" aria-hidden>
      {tramos.map((t, i) => (t.monto > 0 ? <span key={i} className={`rounded-full ${t.clase}`} style={{ width: `${(t.monto / total) * 100}%` }} /> : null))}
    </div>
  );
}
