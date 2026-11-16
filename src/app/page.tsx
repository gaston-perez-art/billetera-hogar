"use client";

import { FilaAhorro } from "@/components/Ahorro";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icono, IconoCategoria, ICONOS } from "@/components/Iconos";
import {
  Boton,
  CampoMonto,
  CampoNombre,
  Dato,
  Encabezado,
  estiloBoton,
  Fecha,
  FilaLista,
  Grupo,
  Hoja,
  MontoGrande,
  MontoMovimiento,
  TarjetaLista,
} from "@/components/ui";
import { Recordatorio } from "@/components/Recordatorio";
import { SaldoFijo } from "@/components/SaldoFijo";
import {
  alcanceDelMes,
  gastosDe,
  movimientosDelMes,
  pagosDelMes,
  paraGastarPorPersona,
  planMes,
  saldoPorDia,
  textoCuota,
  type Alcance,
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
import { usePersonaVista } from "@/lib/vista";

export default function Inicio() {
  const { datos, mes, usuarioId } = useBilletera();
  const [abierto, setAbierto] = useState<Movimiento | null>(null);
  // Vista de una persona: la actividad y la tarjeta muestran solo lo que cargó ella.
  const persona = usePersonaVista();
  const soloYo = persona !== null;
  const quien = persona?.id ?? usuarioId;
  // Cómo se le habla: "Gastaste" si es quien usa la app, "Gastó Jime" si no.
  const t = persona && !persona.vos
    ? { gasto: `Gastó ${persona.nombre}`, queda: "Tiene hoy", libre: `Queda para ${persona.nombre}`, ninguno: `${persona.nombre} no cargó gastos este mes`, libreFalta: (m: string) => `Le falta poner ${m} para la casa.`, libreDeMas: (m: string) => `Puso ${m} de más para la casa: se lo compensan al cerrar el mes.`, libreJusto: "Ya puso toda su parte de la casa.", grupo: `Lo de ${persona.nombre}` }
    : { gasto: "Gastaste", queda: "Tenés hoy", libre: "Queda para vos", ninguno: "No cargaste gastos este mes", libreFalta: (m: string) => `Te falta poner ${m} para la casa.`, libreDeMas: (m: string) => `Pusiste ${m} de más para la casa: te lo compensan al cerrar el mes.`, libreJusto: "Ya pusiste toda tu parte de la casa.", grupo: "Lo tuyo" };
  const plan = planMes(datos, mes);
  const personas = paraGastarPorPersona(datos, mes);
  const saldos = saldoPorDia(datos, mes);
  const fechaHoy = hoy();
  const alcance = alcanceDelMes(datos, mes, fechaHoy);
  const pendientes = pagosDelMes(datos, mes).filter((p) => !p.pagado);
  // "Solo yo": la actividad muestra solo lo que cargó quien usa la app.
  const movimientos = movimientosDelMes(datos, mes).filter((m) => !soloYo || m.pagoPor === quien);
  const mios = gastosDe(datos, mes, quien);
  const yo = personas.find((p) => p.miembroId === quien);
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
      <Encabezado conVista />
      {soloYo ? (
        <SaldoFijo monto={mios.gastado} etiqueta={`${t.gasto} este mes`}>
          <section className="mx-5 mt-4 rounded-3xl superficie px-5 pb-5 pt-6 text-center shadow-tarjeta ring-1 ring-linea">
            <MontoGrande monto={mios.gastado} className="text-[40px]" />
            <p className="mt-2 text-[14px] text-tenue">{t.gasto} este mes</p>
            <dl className="mt-5 grid grid-cols-2 divide-x divide-linea border-t border-linea pt-4">
              <div className="px-2">
                <dt className="text-[12px] text-tenue">{t.queda}</dt>
                <dd className={`mt-0.5 text-[17px] font-semibold tabular-nums ${yo && Math.round(yo.saldo) < 0 ? "text-pasaste" : ""}`}>
                  {pesos(yo?.saldo ?? 0, { ceroComoGuion: false })}
                </dd>
              </div>
              <div className="px-2">
                <dt className="text-[12px] text-tenue">{t.libre}</dt>
                <dd className={`mt-0.5 text-[17px] font-semibold tabular-nums ${yo && Math.round(yo.libre) < 0 ? "text-pasaste" : ""}`}>
                  {pesos(yo?.libre ?? 0, { ceroComoGuion: false })}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-[13px] leading-5 text-tenue">
              {yo && Math.round(yo.faltaPoner) > 0
                ? t.libreFalta(pesos(yo.faltaPoner))
                : yo && Math.round(yo.faltaPoner) < 0
                  ? `${t.libreDeMas(pesos(-yo.faltaPoner))}`
                  : t.libreJusto}
            </p>
          </section>
        </SaldoFijo>
      ) : (
        <SaldoFijo monto={plan.entra - plan.gastado - plan.faltan} etiqueta="Te queda este mes">
          <CuentaDelMes plan={plan} personas={personas} alcance={alcance} />
        </SaldoFijo>
      )}

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
        {!soloYo && <FilaAhorro />}
        {pendientes.length > 0 && (
          <ProximosPagos pendientes={pendientes} mes={mes} fechaHoy={fechaHoy} />
        )}

        {movimientos.length === 0 ? (
          <div className="px-9 py-10 text-center">
            <p className="text-[15px] font-semibold">{soloYo ? t.ninguno : "Sin gastos este mes"}</p>
            <p className="mt-1 text-[15px] text-tenue">
              Lo que cargues va a aparecer acá.
            </p>
          </div>
        ) : (
          <Grupo titulo={soloYo ? t.grupo : "Tu actividad"} sinTarjeta>
            {[...porDia].map(([fecha, lista]) => {
              // Lo que tenían al cierre de ese día: el de hoy es "Tienen hoy" de la tarjeta.
              // En "Solo yo" el saldo es de los dos: se muestra lo que gastaste ese día.
              const saldo = saldos.get(fecha);
              const delDia = lista.reduce((a, m) => a + Math.max(m.monto, 0), 0);
              return (
                <div key={fecha} className="mt-3 first:mt-0">
                  <h3 className="flex items-baseline justify-between gap-3 px-6 pb-2 pt-2 text-[14px]">
                    <span className="font-semibold">{etiquetaDia(fecha)}</span>
                    {soloYo ? (
                      <span className="text-[13px] text-tenue tabular-nums">
                        {t.gasto} {pesos(delDia, { ceroComoGuion: false })}
                      </span>
                    ) : (
                      saldo !== undefined && (
                        <span className="text-[13px] text-tenue tabular-nums">
                          {fecha >= fechaHoy ? "Tienen" : "Tenían"}{" "}
                          {pesos(saldo, { ceroComoGuion: false })}
                        </span>
                      )
                    )}
                  </h3>
                  <TarjetaLista>
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
                        soloYo || m.pagoPor === usuarioId
                          ? categoria(m.categoriaId)
                          : `${categoria(m.categoriaId)}, pagó ${miembro(m.pagoPor)}`
                      }
                      valor={<MontoMovimiento monto={m.monto} />}
                    />
                  ))}
                  </TarjetaLista>
                </div>
              );
            })}
          </Grupo>
        )}
      </main>

      <Recordatorio />

      <Hoja
        abierta={abierto !== null}
        alCerrar={() => setAbierto(null)}
        titulo={abierto && abierto.monto < 0 ? "Detalle de la plata que entra" : "Detalle del gasto"}
      >
        {abierto && <DetalleMovimiento key={abierto.id} movimiento={abierto} alCerrar={() => setAbierto(null)} />}
      </Hoja>
    </>
  );
}

/**
 * Detalle de un movimiento de la actividad: el detalle y el monto se corrigen ahí mismo
 * (con lápiz, como en Ajustes). "Guardar cambios" aparece activo solo si algo cambió.
 */
function DetalleMovimiento({ movimiento: m, alCerrar }: { movimiento: Movimiento; alCerrar: () => void }) {
  const { datos, editarMovimiento, borrarMovimiento } = useBilletera();
  const categoria = datos.categorias.find((c) => c.id === m.categoriaId)?.nombre ?? "";
  const pagador = datos.miembros.find((x) => x.id === m.pagoPor)?.nombre ?? "";
  const entra = m.monto < 0;
  const dePagoFijo = datos.pagosMes.some((p) => p.movimientoId === m.id);
  const [detalle, setDetalle] = useState(m.detalle);
  const [monto, setMonto] = useState(Math.abs(m.monto));
  const cambio = detalle.trim() !== m.detalle || monto !== Math.abs(m.monto);
  const valido = monto > 0;
  const guardar = () => {
    if (!cambio || !valido) return;
    editarMovimiento(m.id, { detalle, monto });
    alCerrar();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <div className="flex items-center gap-3">
        <IconoCategoria nombre={categoria} tamano="lg" entra={entra} />
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold">{categoria}</p>
          <p className="text-[15px] text-tenue">{entra ? "Plata que entra" : dePagoFijo ? "Pago fijo" : "Gasto"}</p>
        </div>
      </div>
      <div className="mt-5">
        <CampoNombre etiqueta="Detalle" valor={detalle} onCambio={setDetalle} placeholder={categoria} />
      </div>
      <div className="py-7">
        <CampoMonto valor={monto} onCambio={setMonto} onEnter={guardar} lapiz entra={entra} />
      </div>
      <dl className="divide-y divide-linea border-y border-linea">
        <Dato etiqueta="Fecha" valor={fechaCorta(m.fecha)} />
        <Dato etiqueta={entra ? "La recibió" : "Pagó"} valor={pagador} />
        {m.medio && <Dato etiqueta="Medio de pago" valor={m.medio} />}
      </dl>
      {dePagoFijo && <p className="mt-3 text-[13px] leading-5 text-tenue">Viene de un pago fijo: el monto nuevo queda como lo pagado este mes.</p>}
      <Boton type="submit" className="mt-6" disabled={!cambio || !valido}>
        Guardar cambios
      </Boton>
      <Boton
        type="button"
        variante="peligro"
        className="mt-3"
        onClick={() => {
          if (confirm(`¿Borrar "${m.detalle || categoria}"?`)) {
            borrarMovimiento(m.id);
            alCerrar();
          }
        }}
      >
        {entra ? "Borrar" : "Borrar gasto"}
      </Boton>
    </form>
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
    <section className="mx-5 overflow-hidden rounded-3xl superficie shadow-tarjeta ring-1 ring-linea">
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
                    {textoCuota(p.pagoFijo, p.mes) ? `${textoCuota(p.pagoFijo, p.mes)}, ${cuandoVence(d).toLowerCase()}` : cuandoVence(d)}
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
 * La tarjeta de Inicio. Responde "¿cuánto nos queda?" y "¿hasta cuándo alcanza?".
 * Plegada: te queda (tienen hoy − pagos fijos que faltan), hasta cuándo alcanza a este ritmo,
 * y las dos cifras de la resta. Abierta: la cuenta renglón por renglón, la proyección a fin de
 * mes y, aparte, lo libre de cada uno según los techos. Se acuerda si la dejaste abierta.
 */
function CuentaDelMes({
  plan,
  personas,
  alcance,
}: {
  plan: PlanMes;
  personas: ParaGastarPersona[];
  alcance: Alcance | null;
}) {
  const { entra, gastado, saldo, faltan, sobrante, extra } = plan;
  // Lo que salió en gastos, sin la plata extra (que `gastado` ya trae restada).
  const gastos = gastado + extra;
  const teQueda = saldo - faltan;
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
    { etiqueta: "Ya gastaron", monto: gastos, color: "bg-tenue" },
    { etiqueta: "Pagos que faltan", monto: faltan, color: "bg-sutil" },
    { etiqueta: "Te queda", monto: Math.max(teQueda, 0), color: "bg-marca" },
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
      <dd className={`${fuerte ? "font-bold" : ""} ${resta ? (Math.round(monto) < 0 ? "text-queda" : "") : rojo(monto)}`}>
        {resta ? (Math.round(monto) < 0 ? "+ " : "- ") : ""}
        {pesos(resta ? Math.abs(monto) : monto, { ceroComoGuion: false })}
      </dd>
    </div>
  );

  const diasQueFaltan = alcance ? Math.round((alcance.teQueda - alcance.finDeMes) / (alcance.porDia || 1)) : 0;

  return (
    <section className="mx-5 mt-4 rounded-3xl superficie shadow-tarjeta ring-1 ring-linea">
      <button
        onClick={alternar}
        aria-expanded={abierta}
        className="block w-full px-5 pb-4 pt-6 text-center"
      >
        <MontoGrande monto={teQueda} className={`text-[40px] ${rojo(teQueda)}`} />
        <p className="mt-2 text-[14px] text-tenue">Te queda este mes</p>
        {alcance && entra > 0 && (
          Math.round(alcance.teQueda) <= 0 ? (
            <p className="mt-2 text-[14px] font-medium leading-5 text-pasaste">
              Ya no alcanza para lo que falta del mes.
            </p>
          ) : (
            <>
              <p className="mt-2 text-balance text-[15px] font-medium leading-5">
                Para llegar a fin de mes: hasta {pesos(alcance.paraLlegar)} por día.
              </p>
              {alcance.porDia > 0 && (
                <p
                  className={`mt-1 text-[13px] leading-5 ${Math.round(alcance.porDia) > Math.round(alcance.paraLlegar) ? "text-pasaste" : "text-queda"}`}
                >
                  Vienen gastando {pesos(alcance.porDia)} por día.
                </p>
              )}
            </>
          )
        )}

        {entra > 0 && (
          <dl className="mt-5 grid grid-cols-2 divide-x divide-linea border-t border-linea pt-4">
            <div className="px-2">
              <dt className="text-[12px] text-tenue">Tienen hoy</dt>
              <dd className={`mt-0.5 text-[17px] font-semibold tabular-nums ${rojo(saldo)}`}>
                {pesos(saldo, { ceroComoGuion: false })}
              </dd>
            </div>
            <div className="px-2">
              <dt className="text-[12px] text-tenue">Faltan pagar</dt>
              <dd className="mt-0.5 text-[17px] font-semibold tabular-nums">
                {pesos(faltan, { ceroComoGuion: false })}
              </dd>
            </div>
          </dl>
        )}

        <span className="mt-4 flex items-center justify-center gap-1 text-[13px] font-semibold text-marca">
          {abierta ? "Ocultar la cuenta" : "Ver la cuenta"}
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
                  aria-label="En qué se va lo que entró este mes"
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
                  {Math.round(extra) > 0 ? (
                    <>
                      <Renglon etiqueta="Sueldos" monto={entra} />
                      <Renglon etiqueta="Plata extra" monto={-extra} resta />
                    </>
                  ) : (
                    <Renglon etiqueta="Entró este mes" monto={entra} />
                  )}
                  <Renglon etiqueta="Ya gastaron" monto={gastos} color="bg-tenue" resta />
                  <Renglon etiqueta="Tienen hoy" monto={saldo} fuerte />
                  <Renglon etiqueta="Pagos que faltan" monto={faltan} color="bg-sutil" resta />
                  <Renglon etiqueta="Te queda este mes" monto={teQueda} color="bg-marca" fuerte />
                </dl>

                {alcance && alcance.porDia > 0 && (
                  <>
                    <p className="mt-5 text-[13px] text-tenue">Si siguen gastando igual hasta fin de mes:</p>
                    <dl className="mt-2 space-y-2.5 text-[15px] tabular-nums">
                      <Renglon
                        etiqueta={`${pesos(alcance.porDia)} por día, ${diasQueFaltan} ${diasQueFaltan === 1 ? "día" : "días"}`}
                        monto={alcance.teQueda - alcance.finDeMes}
                        resta
                      />
                      <Renglon
                        etiqueta={Math.round(alcance.finDeMes) < 0 ? "Faltaría a fin de mes" : "Sobraría a fin de mes"}
                        monto={alcance.finDeMes}
                        fuerte
                      />
                    </dl>
                    {alcance.seAcaba && (
                      <p className="mt-2 text-[13px] leading-5 text-tenue">
                        A ese ritmo, la plata se acaba el {fechaCorta(alcance.seAcaba)}.
                      </p>
                    )}
                  </>
                )}

                {personas.length > 1 && (
                  <>
                    <p className="mt-5 text-[13px] leading-5 text-tenue">
                      {Math.round(sobrante) < 0
                        ? `Los techos de las categorías suman ${pesos(-sobrante)} más de lo que entra, así que a ninguno le queda plata propia:`
                        : "Para cada uno, después de poner su parte de la casa según los techos:"}
                    </p>
                    <dl className="mt-2 space-y-2.5 text-[15px] tabular-nums">
                      {personas.map((p) => (
                        <Renglon key={p.miembroId} etiqueta={`Queda para ${p.nombre}`} monto={p.libre} />
                      ))}
                    </dl>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
