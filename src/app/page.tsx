"use client";

import Link from "next/link";
import { Encabezado, Fila, Tarjeta } from "@/components/ui";
import { movimientosDelMes, pagosDelMes, resumenMes, totalSantino } from "@/lib/calculos";
import { fechaCorta, pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

export default function Inicio() {
  const { datos, mes, borrarMovimiento } = useBilletera();
  const r = resumenMes(datos, mes);
  const pendientes = pagosDelMes(datos, mes).filter((p) => !p.pagado);
  const movimientos = movimientosDelMes(datos, mes);
  const santino = totalSantino(datos, mes);
  const nombreCategoria = (id: string) => datos.categorias.find((c) => c.id === id)?.nombre ?? "";
  const nombreMiembro = (id: string) => datos.miembros.find((m) => m.id === id)?.nombre ?? "";

  return (
    <>
      <Encabezado titulo="Billetera Hogar" />
      <main className="space-y-3 px-4 pt-4">
        <section className="rounded-3xl bg-marca p-5 text-white shadow-lg shadow-marca/20">
          <p className="text-sm text-white/75">Te queda de verdad</p>
          <p className={`mt-1 text-4xl font-semibold tracking-tight tabular-nums ${r.teQueda < 0 ? "text-red-200" : ""}`}>
            {pesos(r.teQueda, { ceroComoGuion: false })}
          </p>
          <p className="mt-1 text-xs text-white/70">Lo que entra, menos lo gastado, menos los pagos que faltan.</p>
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-white/20 pt-3 text-sm">
            <Dato etiqueta="Entra" valor={r.entra} />
            <Dato etiqueta="Gastado" valor={r.gastado} />
            <Dato etiqueta="Faltan pagar" valor={r.faltan} />
          </dl>
        </section>

        {pendientes.length > 0 && (
          <Tarjeta>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-semibold">Próximos pagos</h2>
              <Link href="/pagos" className="text-sm font-medium text-marca">Ver todos</Link>
            </div>
            {pendientes.slice(0, 3).map((p) => (
              <Fila key={p.pagoFijo.id} etiqueta={`${p.pagoFijo.dia} · ${p.pagoFijo.concepto}`} valor={pesos(p.monto)} />
            ))}
          </Tarjeta>
        )}

        {santino !== 0 && (
          <Tarjeta className="flex items-center justify-between">
            <span className="text-tenue">Gastos de Santino este mes</span>
            <span className="font-semibold tabular-nums">{pesos(santino)}</span>
          </Tarjeta>
        )}

        <Tarjeta>
          <h2 className="mb-2 font-semibold">Movimientos</h2>
          {movimientos.length === 0 ? (
            <p className="py-6 text-center text-sm text-tenue">
              Todavía no hay gastos este mes. Tocá <b>+</b> para cargar el primero.
            </p>
          ) : (
            <ul className="divide-y divide-linea">
              {movimientos.map((m) => (
                <li key={m.id} className="group flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.detalle || nombreCategoria(m.categoriaId)}</p>
                    <p className="truncate text-xs text-tenue">
                      {fechaCorta(m.fecha)} · {nombreCategoria(m.categoriaId)} · pagó {nombreMiembro(m.pagoPor)}
                    </p>
                  </div>
                  <span className={`tabular-nums font-medium ${m.monto < 0 ? "text-queda" : ""}`}>
                    {m.monto < 0 ? `+${pesos(-m.monto)}` : pesos(m.monto)}
                  </span>
                  <button
                    onClick={() => confirm(`¿Borrar "${m.detalle || "gasto"}"?`) && borrarMovimiento(m.id)}
                    aria-label="Borrar"
                    className="grid size-7 place-items-center rounded-full text-tenue/60 hover:bg-pasaste-suave hover:text-pasaste"
                  >
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
        <p className="px-2 text-center text-xs text-tenue">
          POC: los datos son de demo y viven en este navegador.
        </p>
      </main>
    </>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div>
      <dt className="text-xs text-white/70">{etiqueta}</dt>
      <dd className="font-medium tabular-nums">{pesos(valor)}</dd>
    </div>
  );
}
