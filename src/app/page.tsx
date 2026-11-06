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
import { SaldoFijo } from "@/components/SaldoFijo";
import { movimientosDelMes, pagosDelMes, planMes, quedabaPorDia, resumenMes } from "@/lib/calculos";
import { cuandoVence, diasEntre, etiquetaDia, fechaCorta, fechaEnMes, hoy, mesCorto, pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";
import type { Movimiento } from "@/lib/tipos";

export default function Inicio() {
  const { datos, mes, usuarioId, borrarMovimiento } = useBilletera();
  const [abierto, setAbierto] = useState<Movimiento | null>(null);
  const r = resumenMes(datos, mes);
  const plan = planMes(datos, mes);
  const quedaba = quedabaPorDia(datos, mes);
  const fechaHoy = hoy();
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
      <SaldoFijo monto={r.teQueda} etiqueta="Te queda este mes">
        <Resumen etiqueta="Te queda este mes" monto={r.teQueda} tono="queda">
          <ComoVienen entra={r.entra} ahorroIdeal={plan.ahorroIdeal} puedenGastar={plan.puedenGastar} />
          <Cifras
            items={[
              { etiqueta: "Entra", valor: pesos(r.entra) },
              { etiqueta: "Gastado", valor: pesos(r.gastado) },
              { etiqueta: "Por pagar", valor: pesos(r.faltan) },
            ]}
          />
        </Resumen>
      </SaldoFijo>

      <div className="mt-5 grid grid-cols-2 gap-3 px-5">
        <Link href="/cargar" className={estiloBoton("principal")}>
          <Icono trazo={ICONOS.mas} className="size-5" />
          Cargar gasto
        </Link>
        <Link href="/pagos" className={estiloBoton("secundario")}>
          <Icono trazo={ICONOS.pagos} className="size-5" />
          Pagos fijos
        </Link>
      </div>

      <main className="mt-7 space-y-7">
        {pendientes.length > 0 && (
          <section className="mx-5 rounded-3xl bg-relleno pb-2 pt-1">
            <div className="flex h-12 items-center justify-between pl-4 pr-2">
              <h2 className="text-[16px] font-semibold">Próximos pagos</h2>
              <Link href="/pagos" className="flex h-9 items-center gap-0.5 rounded-full px-3 text-[14px] font-semibold text-marca">
                Ver todos
                <Icono trazo={ICONOS.adelante} className="size-4" />
              </Link>
            </div>
            {pendientes.slice(0, 3).map((p) => {
              const vence = fechaEnMes(mes, p.pagoFijo.dia);
              const dias = diasEntre(fechaHoy, vence);
              return (
                <Link key={p.pagoFijo.id} href="/pagos" className="fila flex min-h-16 items-center gap-3 px-4 py-2">
                  <Fecha dia={p.pagoFijo.dia} mes={mesCorto(mes)} vencida={dias < 0} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{p.pagoFijo.concepto}</span>
                    <span className={`mt-0.5 block text-[13px] ${dias < 0 ? "text-pasaste" : "text-tenue"}`}>{cuandoVence(dias)}</span>
                  </span>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums">{pesos(p.monto)}</span>
                </Link>
              );
            })}
          </section>
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
            {[...porDia].map(([fecha, lista]) => {
              const saldo = quedaba.get(fecha);
              return (
                <div key={fecha}>
                  <h3 className="flex items-baseline justify-between gap-3 px-5 pb-1 pt-4 text-[14px]">
                    <span className="font-semibold">{etiquetaDia(fecha)}</span>
                    {saldo !== undefined && (
                      <span className="text-[13px] text-tenue tabular-nums">
                        {fecha >= fechaHoy ? "Te queda" : "Te quedaba"} {pesos(saldo, { ceroComoGuion: false })}
                      </span>
                    )}
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
              );
            })}
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

/**
 * La respuesta a "¿vamos bien?", en una frase y sin gráficos: cuánto pueden gastar todavía
 * sin pasarse de los techos y cuánto les queda para ahorrar.
 */
function ComoVienen({ entra, ahorroIdeal, puedenGastar }: { entra: number; ahorroIdeal: number; puedenGastar: number }) {
  const fuerte = (n: number) => <strong className="font-semibold text-texto">{pesos(Math.abs(n), { ceroComoGuion: false })}</strong>;
  let frase: React.ReactNode;
  if (entra <= 0) {
    frase = <>Cargá los ingresos en Ajustes para ver cómo vienen.</>;
  } else if (ahorroIdeal < 0) {
    frase = <>Este mes el presupuesto supera lo que entra por {fuerte(ahorroIdeal)}. Conviene bajar algún techo.</>;
  } else if (puedenGastar < 0) {
    frase = <>Los pagos que faltan superan lo que queda de los techos por {fuerte(puedenGastar)}. Eso sale del ahorro.</>;
  } else {
    frase = (
      <>
        Pueden gastar {fuerte(puedenGastar)} más sin pasarse, y ahorrar {fuerte(ahorroIdeal)}.
      </>
    );
  }
  return <p className="mb-4 rounded-2xl bg-relleno px-4 py-3 text-[14px] leading-5 text-tenue">{frase}</p>;
}
