"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icono, IconoCategoria, ICONOS } from "@/components/Iconos";
import {
  Avatar,
  Boton,
  Dato,
  Encabezado,
  estiloBoton,
  Fecha,
  FilaLista,
  Grupo,
  Hoja,
  MontoGrande,
  MontoMovimiento,
} from "@/components/ui";
import { SaldoFijo } from "@/components/SaldoFijo";
import {
  movimientosDelMes,
  pagosDelMes,
  paraGastarPorPersona,
  planMes,
  saldoPorDia,
  type PagoDelMes,
  type ParaGastarPersona,
  type PlanMes,
} from "@/lib/calculos";
import {
  cuandoVence,
  diasEntre,
  etiquetaDia,
  fechaCorta,
  fechaEnMes,
  hoy,
  mesCorto,
  pesos,
} from "@/lib/formato";
import { useBilletera } from "@/lib/store";
import type { Movimiento } from "@/lib/tipos";

export default function Inicio() {
  const { datos, mes, usuarioId, borrarMovimiento } = useBilletera();
  const [abierto, setAbierto] = useState<Movimiento | null>(null);
  const plan = planMes(datos, mes);
  const personas = paraGastarPorPersona(datos, mes);
  const saldos = saldoPorDia(datos, mes);
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
      <SaldoFijo monto={plan.saldo} etiqueta="Tienen entre los dos">
        <CuentaDelMes plan={plan} personas={personas} />
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
          <ProximosPagos pendientes={pendientes} mes={mes} fechaHoy={fechaHoy} />
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
              // Saldo al cierre de ese día: el de hoy es el número grande de la tarjeta.
              const saldo = saldos.get(fecha);
              return (
                <div key={fecha}>
                  <h3 className="flex items-baseline justify-between gap-3 px-5 pb-1 pt-4 text-[14px]">
                    <span className="font-semibold">{etiquetaDia(fecha)}</span>
                    {saldo !== undefined && (
                      <span className="text-[13px] text-tenue tabular-nums">
                        {fecha >= fechaHoy ? "Te queda" : "Te quedaba"}{" "}
                        {pesos(saldo, { ceroComoGuion: false })}
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

const CLAVE_PAGOS_ABIERTOS = "billetera-hogar:proximos-pagos-abiertos";

/**
 * Próximos pagos, plegado por defecto para que la actividad quede a la vista.
 * Plegado dice cuántos faltan, cuánto suman y cuándo vence el primero. Se acuerda si lo abriste.
 */
function ProximosPagos({
  pendientes,
  mes,
  fechaHoy,
}: {
  pendientes: PagoDelMes[];
  mes: string;
  fechaHoy: string;
}) {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    try {
      setAbierto(localStorage.getItem(CLAVE_PAGOS_ABIERTOS) === "1");
    } catch {
      // Sin storage: arranca plegado.
    }
  }, []);
  const alternar = () =>
    setAbierto((a) => {
      try {
        localStorage.setItem(CLAVE_PAGOS_ABIERTOS, a ? "0" : "1");
      } catch {
        // Sin storage: no se recuerda.
      }
      return !a;
    });

  const dias = (p: PagoDelMes) => diasEntre(fechaHoy, fechaEnMes(mes, p.pagoFijo.dia));
  const vencidos = pendientes.filter((p) => dias(p) < 0).length;
  const total = pendientes.reduce((a, p) => a + p.monto, 0);
  const primero = pendientes.find((p) => dias(p) >= 0);
  const resumen =
    vencidos > 0
      ? `${vencidos === 1 ? "1 vencido" : `${vencidos} vencidos`}, faltan ${pesos(total)}`
      : `${pendientes.length === 1 ? "1 pago" : `${pendientes.length} pagos`}, ${pesos(total)}${
          primero ? `, el primero ${cuandoVence(dias(primero)).toLowerCase()}` : ""
        }`;

  return (
    <section className="mx-5 rounded-3xl bg-relleno">
      <button
        onClick={alternar}
        aria-expanded={abierto}
        className="fila flex w-full items-center gap-3 rounded-3xl py-3 pl-4 pr-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold">Próximos pagos</span>
          <span
            className={`mt-0.5 block truncate text-[13px] tabular-nums ${vencidos > 0 ? "text-pasaste" : "text-tenue"}`}
          >
            {resumen}
          </span>
        </span>
        <Icono
          trazo={ICONOS.adelante}
          className={`size-5 shrink-0 text-tenue transition-transform duration-200 ${abierto ? "-rotate-90" : "rotate-90"}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-250 ease-out motion-reduce:transition-none ${abierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden" inert={!abierto}>
          {pendientes.slice(0, 3).map((p) => {
            const d = dias(p);
            return (
              <Link
                key={p.pagoFijo.id}
                href="/pagos"
                className="fila flex min-h-16 items-center gap-3 px-4 py-2"
              >
                <Fecha dia={p.pagoFijo.dia} mes={mesCorto(mes)} vencida={d < 0} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">
                    {p.pagoFijo.concepto}
                  </span>
                  <span
                    className={`mt-0.5 block text-[13px] ${d < 0 ? "text-pasaste" : "text-tenue"}`}
                  >
                    {cuandoVence(d)}
                  </span>
                </span>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                  {pesos(p.monto)}
                </span>
              </Link>
            );
          })}
          <Link
            href="/pagos"
            className="mx-2 mb-2 flex h-11 items-center justify-center gap-0.5 rounded-full text-[14px] font-semibold text-marca"
          >
            {pendientes.length > 3 ? `Ver los ${pendientes.length} pagos` : "Ver todos los pagos"}
            <Icono trazo={ICONOS.adelante} className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

const CLAVE_CUENTA_ABIERTA = "billetera-hogar:cuenta-abierta";

/**
 * La tarjeta de Inicio. Plegada: la plata que tienen entre los dos y lo que le queda a cada uno.
 * Abierta: la cuenta de arriba hacia abajo, con su barra: entró, menos lo gastado (= lo que tienen),
 * menos los pagos que faltan y el ahorro (= lo que pueden gastar).
 * Se acuerda si la dejaste abierta.
 */
function CuentaDelMes({
  plan,
  personas,
}: {
  plan: PlanMes;
  personas: ParaGastarPersona[];
}) {
  const {
    entra,
    gastado,
    saldo,
    faltan,
    paraCadaUno,
    sobrante,
    paraGastar,
  } = plan;
  const [abierta, setAbierta] = useState(false);
  useEffect(() => {
    try {
      setAbierta(localStorage.getItem(CLAVE_CUENTA_ABIERTA) === "1");
    } catch {
      // Sin storage: arranca plegada.
    }
  }, []);
  const alternar = () =>
    setAbierta((a) => {
      try {
        localStorage.setItem(CLAVE_CUENTA_ABIERTA, a ? "0" : "1");
      } catch {
        // Sin storage: no se recuerda, no pasa nada.
      }
      return !a;
    });

  const rojo = (n: number) => (Math.round(n) < 0 ? "text-pasaste" : "");
  const partes = [
    { etiqueta: "Ya gastaron", monto: gastado, color: "bg-tenue" },
    { etiqueta: "Pagos que faltan", monto: faltan, color: "bg-sutil" },
    { etiqueta: "Para cada uno", monto: paraCadaUno, color: "bg-marca/40" },
    {
      etiqueta: "Para gastar",
      monto: Math.max(paraGastar, 0),
      color: "bg-marca",
    },
  ];
  const total = partes.reduce((a, p) => a + Math.max(p.monto, 0), 0) || 1;
  const Renglon = ({
    etiqueta,
    monto,
    color,
    resta = false,
    fuerte = false,
  }: {
    etiqueta: string;
    monto: number;
    color?: string;
    resta?: boolean;
    fuerte?: boolean;
  }) => (
    <div
      className={`flex items-baseline justify-between ${fuerte ? "border-t border-linea pt-2.5" : ""}`}
    >
      <dt
        className={`flex items-center gap-2 ${fuerte ? "font-semibold" : "text-tenue"}`}
      >
        {color && <span className={`size-2.5 rounded-full ${color}`} />}
        {etiqueta}
      </dt>
      <dd className={`${fuerte ? "font-bold" : ""} ${rojo(monto)}`}>
        {resta ? "- " : ""}
        {pesos(monto, { ceroComoGuion: false })}
      </dd>
    </div>
  );

  return (
    <section className="mx-5 mt-4 rounded-3xl bg-tarjeta shadow-tarjeta ring-1 ring-linea">
      <button
        onClick={alternar}
        aria-expanded={abierta}
        className="block w-full px-5 pb-4 pt-6 text-center"
      >
        <MontoGrande monto={saldo} className={`text-[40px] ${rojo(saldo)}`} />
        <p className="mt-2 text-[14px] text-tenue">Tienen entre los dos</p>

        {entra > 0 && personas.length > 1 && (
          <div className="mt-4 border-t border-linea pt-3">
            <p className="text-[12px] text-tenue">Le queda a cada uno</p>
            <div className="mt-2 grid grid-cols-2 divide-x divide-linea">
              {personas.map((p) => (
                <div
                  key={p.miembroId}
                  className="flex flex-col items-center gap-1 px-2"
                >
                  <span className="flex items-center gap-1.5 text-[14px] font-medium">
                    <Avatar id={p.miembroId} nombre={p.nombre} tamano={22} />
                    {p.nombre}
                  </span>
                  <span
                    className={`text-[17px] font-semibold tabular-nums ${rojo(p.saldo)}`}
                  >
                    {pesos(p.saldo, { ceroComoGuion: false })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <span className="mt-4 flex items-center justify-center gap-1 text-[13px] font-semibold text-marca">
          {abierta
            ? "Ocultar la cuenta"
            : `Ver la cuenta, quedan ${pesos(paraGastar, { ceroComoGuion: false })} para la casa`}
          <Icono
            trazo={ICONOS.adelante}
            className={`size-4 transition-transform duration-200 ${abierta ? "-rotate-90" : "rotate-90"}`}
          />
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-250 ease-out motion-reduce:transition-none ${abierta ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-5 pb-5">
            {entra <= 0 ? (
              <p className="rounded-2xl bg-relleno px-4 py-3 text-center text-[14px] text-tenue">
                Cargá los ingresos en Ajustes para ver la cuenta del mes.
              </p>
            ) : (
              <>
                <div
                  className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
                  role="img"
                  aria-label="En qué se reparte lo que entró este mes"
                >
                  {partes
                    .filter((p) => p.monto > 0)
                    .map((p) => (
                      <span
                        key={p.etiqueta}
                        className={`${p.color} transition-[flex-grow] duration-500`}
                        style={{ flexGrow: p.monto / total }}
                      />
                    ))}
                </div>
                <dl className="mt-4 space-y-2.5 text-[15px] tabular-nums">
                  <Renglon etiqueta="Entró este mes" monto={entra} />
                  <Renglon
                    etiqueta="Ya gastaron"
                    monto={gastado}
                    color="bg-tenue"
                    resta
                  />
                  <Renglon
                    etiqueta="Tienen entre los dos"
                    monto={saldo}
                    fuerte
                  />
                  <Renglon
                    etiqueta="Pagos que faltan"
                    monto={faltan}
                    color="bg-sutil"
                    resta
                  />
                  <Renglon
                    etiqueta="Para cada uno"
                    monto={paraCadaUno}
                    color="bg-marca/40"
                    resta
                  />
                  <Renglon
                    etiqueta="Queda para la casa"
                    monto={paraGastar}
                    color={
                      Math.round(paraGastar) < 0 ? "bg-pasaste" : "bg-marca"
                    }
                    fuerte
                  />
                </dl>
                {personas.length > 1 && (
                  <p className="mt-3 text-[13px] leading-5 text-tenue">
                    Le queda a cada uno: lo que le entró menos lo que ya puso.
                    Para cada uno: lo que le sobra a cada uno después de poner
                    su parte de la casa, según lo que gana (en Reparto, «Queda
                    para» cada uno).
                  </p>
                )}
                {sobrante < 0 && (
                  <p className="mt-3 text-[13px] leading-5 text-pasaste">
                    Este mes los techos suman {pesos(-sobrante)} más de lo
                    que entra: no sobra nada para cada uno.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
