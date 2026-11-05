"use client";

import Link from "next/link";
import { useState } from "react";
import { Icono, IconoCategoria, ICONOS } from "@/components/Iconos";
import {
  Boton,
  Cifras,
  Dato,
  Encabezado,
  estiloBoton,
  Fecha,
  FilaLista,
  Grupo,
  Hoja,
  MontoGrande,
  MontoMovimiento,
  Resumen,
} from "@/components/ui";
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
  const categoria = (id: string) =>
    datos.categorias.find((c) => c.id === id)?.nombre ?? "";
  const miembro = (id: string) =>
    datos.miembros.find((m) => m.id === id)?.nombre ?? "";

  const porDia = new Map<string, Movimiento[]>();
  for (const m of [...movimientos].sort((a, b) =>
    (b.fecha + b.creadoEn).localeCompare(a.fecha + a.creadoEn),
  )) {
    porDia.set(m.fecha, [...(porDia.get(m.fecha) ?? []), m]);
  }

  return (
    <>
      <Encabezado />
      <Resumen etiqueta="Te queda este mes" monto={r.teQueda} tono="queda">
        <Cifras
          items={[
            { etiqueta: "Entra", valor: pesos(r.entra) },
            { etiqueta: "Gastado", valor: pesos(r.gastado) },
            { etiqueta: "Por pagar", valor: pesos(r.faltan) },
          ]}
        />
      </Resumen>

      <div className="mt-5 grid grid-cols-2 gap-3 px-5">
        <Link href="/cargar" className={estiloBoton("principal")}>
          <Icono trazo={ICONOS.mas} className="size-5" />
          Cargar gasto
        </Link>
        <Link href="/pagos" className={estiloBoton("principal")}>
          <Icono trazo={ICONOS.pagos} className="size-5" />
          Pagos fijos
        </Link>
      </div>

      <main className="mt-7 space-y-6">
        {pendientes.length > 0 && (
          <Grupo
            titulo="Próximos pagos"
            accion={{ texto: "Ver todos los pagos", href: "/pagos" }}
          >
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
            <p className="mt-1 text-[15px] text-tenue">
              Lo que cargues va a aparecer acá.
            </p>
          </div>
        ) : (
          <Grupo titulo="Tu actividad">
            {[...porDia].map(([fecha, lista]) => (
              <div key={fecha}>
                <h3 className="px-5 pb-1 pt-3 text-[13px] font-medium text-tenue">
                  {etiquetaDia(fecha)}
                </h3>
                {lista.map((m) => (
                  <FilaLista
                    key={m.id}
                    onClick={() => setAbierto(m)}
                    icono={
                      <IconoCategoria
                        nombre={categoria(m.categoriaId)}
                        entra={m.monto < 0}
                      />
                    }
                    titulo={m.detalle || categoria(m.categoriaId)}
                    bajada={
                      m.pagoPor === usuarioId
                        ? categoria(m.categoriaId)
                        : `${categoria(m.categoriaId)}, pagó ${miembro(m.pagoPor)}`
                    }
                    valor={<MontoMovimiento monto={m.monto} />}
                  />
                ))}
              </div>
            ))}
          </Grupo>
        )}
      </main>

      <Hoja
        abierta={abierto !== null}
        alCerrar={() => setAbierto(null)}
        titulo="Detalle del gasto"
      >
        {abierto && (
          <>
            <div className="flex items-center gap-3">
              <IconoCategoria
                nombre={categoria(abierto.categoriaId)}
                tamano="lg"
                entra={abierto.monto < 0}
              />
              <div className="min-w-0">
                <p className="truncate text-[17px] font-semibold">
                  {abierto.detalle || categoria(abierto.categoriaId)}
                </p>
                <p className="text-[15px] text-tenue">
                  {categoria(abierto.categoriaId)}
                </p>
              </div>
            </div>
            <MontoGrande
              monto={Math.abs(abierto.monto)}
              className={`mt-5 text-[36px] leading-none ${abierto.monto < 0 ? "text-queda" : ""}`}
            />
            <dl className="mt-4 divide-y divide-linea border-y border-linea">
              <Dato etiqueta="Fecha" valor={fechaCorta(abierto.fecha)} />
              <Dato etiqueta="Pagó" valor={miembro(abierto.pagoPor)} />
              {abierto.medio && (
                <Dato etiqueta="Medio de pago" valor={abierto.medio} />
              )}
              {abierto.monto < 0 && (
                <Dato etiqueta="Tipo" valor="Plata que entra" />
              )}
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
