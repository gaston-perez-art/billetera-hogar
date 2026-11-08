"use client";

// Pagos, con dos pestañas:
// - Fijos: agenda del mes (vencidos, hoy, esta semana, más adelante y pagados). El tiempo se
//   lee de arriba hacia abajo, sin descifrar un gráfico. Incluye las cuotas de las tarjetas.
// - Tarjetas: las compras en cuotas agrupadas por tarjeta (components/Tarjetas.tsx).
// - Préstamos: cuotas de préstamos, con el monto del banco de cada mes (components/Prestamos.tsx).

import { useEffect, useState } from "react";
import { Icono, ICONOS } from "@/components/Iconos";
import { SaldoFijo } from "@/components/SaldoFijo";
import { SelloLogro } from "@/components/Ilustracion";
import { DetallePrestamo, VistaPrestamos } from "@/components/Prestamos";
import { VistaTarjetas } from "@/components/Tarjetas";
import { Cifras, Encabezado, Fecha, Grupo, Hoja, Resumen } from "@/components/ui";
import { esEnDolares, logroPagos, pagosDelMes, textoCuota, type PagoDelMes } from "@/lib/calculos";
import { cuandoVence, diasEntre, fechaEnMes, hoy, mesCorto, mesDe, nombreMes, pesos, sumarMeses } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

type Pestana = "fijos" | "tarjetas" | "prestamos";
const CLAVE_PESTANA = "billetera-hogar:pagos-pestana";

/** Fijos, Tarjetas o Préstamos. Se acuerda en este celular de la última que abriste. */
function usePestana(): [Pestana, (p: Pestana) => void] {
  const [pestana, setPestana] = useState<Pestana>("fijos");
  useEffect(() => {
    try {
      const guardada = localStorage.getItem(CLAVE_PESTANA);
      if (guardada === "tarjetas" || guardada === "prestamos") setPestana(guardada);
    } catch {}
  }, []);
  const cambiar = (p: Pestana) => {
    setPestana(p);
    try {
      localStorage.setItem(CLAVE_PESTANA, p);
    } catch {}
  };
  return [pestana, cambiar];
}

export default function Pagos() {
  const [pestana, setPestana] = usePestana();
  return (
    <>
      <Encabezado titulo="Pagos" />
      <div className="mx-5 mt-3 grid grid-cols-3 rounded-full bg-relleno p-1" role="tablist" aria-label="Pagos">
        {(
          [
            ["fijos", "Fijos"],
            ["tarjetas", "Tarjetas"],
            ["prestamos", "Préstamos"],
          ] as [Pestana, string][]
        ).map(([valor, texto]) => (
          <button
            key={valor}
            role="tab"
            aria-selected={pestana === valor}
            onClick={() => setPestana(valor)}
            className="h-10 rounded-full text-[14px] font-semibold text-tenue aria-selected:bg-tarjeta aria-selected:text-texto aria-selected:shadow-tarjeta"
          >
            {texto}
          </button>
        ))}
      </div>
      {pestana === "fijos" ? <PagosFijos /> : pestana === "tarjetas" ? <VistaTarjetas /> : <VistaPrestamos />}
    </>
  );
}

function PagosFijos() {
  const { datos, mes, usuarioId, marcarPagado, desmarcarPagado } = useBilletera();
  const fechaHoy = hoy();
  const mesActual = mesDe(fechaHoy);
  const pagos = pagosDelMes(datos, mes);
  const [enDolares, setEnDolares] = useState<string | null>(null);
  const prestamoEnDolares = datos.pagosFijos.find((p) => p.id === enDolares);
  const pendientes = pagos.filter((p) => !p.pagado);
  const pagados = pagos.filter((p) => p.pagado);
  const faltan = pendientes.reduce((a, p) => a + p.monto, 0);
  const total = pagos.reduce((a, p) => a + p.monto, 0);
  const logro = logroPagos(datos, mes);
  const quien = datos.miembros.find((m) => m.id === usuarioId)?.nombre;
  const pagadorDe = (movimientoId?: string) => {
    const mov = datos.movimientos.find((m) => m.id === movimientoId);
    return datos.miembros.find((m) => m.id === mov?.pagoPor)?.nombre;
  };
  const dias = (p: PagoDelMes) => diasEntre(fechaHoy, fechaEnMes(mes, p.pagoFijo.dia));

  // Agenda del mes actual. Un mes pasado: lo que no se pagó quedó sin pagar. Uno futuro: todo por pagar.
  const grupos: { titulo: string; pagos: PagoDelMes[] }[] =
    mes === mesActual
      ? [
          { titulo: "Vencidos", pagos: pendientes.filter((p) => dias(p) < 0) },
          { titulo: "Vencen hoy", pagos: pendientes.filter((p) => dias(p) === 0) },
          { titulo: "Esta semana", pagos: pendientes.filter((p) => dias(p) >= 1 && dias(p) <= 7) },
          { titulo: "Más adelante", pagos: pendientes.filter((p) => dias(p) > 7) },
        ]
      : mes < mesActual
        ? [{ titulo: "Quedaron sin pagar", pagos: pendientes }]
        : [{ titulo: "Por pagar", pagos: pendientes }];

  const fila = (p: PagoDelMes) => {
    const d = dias(p);
    const vencido = !p.pagado && mes <= mesActual && d < 0;
    const cuota = textoCuota(p.pagoFijo, mes);
    const bajada = [
      cuota,
      ...(p.pagado
        ? [pesos(p.monto), pagadorDe(p.movimientoId) ? `pagó ${pagadorDe(p.movimientoId)}` : null]
        : [pesos(p.monto), mes === mesActual ? cuandoVence(d).toLowerCase() : null]),
    ]
      .filter(Boolean)
      .join(", ");
    return (
      <div key={p.pagoFijo.id} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
        <Fecha dia={p.pagoFijo.dia} mes={mesCorto(mes)} vencida={vencido} />
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[15px] font-medium ${p.pagado ? "text-tenue" : ""}`}>{p.pagoFijo.concepto}</p>
          <p className={`mt-0.5 truncate text-[13px] tabular-nums ${vencido ? "text-pasaste" : "text-tenue"}`}>{bajada}</p>
        </div>
        {p.pagado ? (
          <button
            onClick={() =>
              confirm(`¿Marcar "${p.pagoFijo.concepto}" como no pagado? Se borra el gasto que se cargó.`) &&
              desmarcarPagado(p.pagoFijo.id, mes)
            }
            aria-label={`Desmarcar ${p.pagoFijo.concepto} como pagado`}
            className="grid size-9 place-items-center rounded-full bg-marca-suave text-marca"
          >
            <Icono trazo={ICONOS.check} className="size-5" />
          </button>
        ) : (
          <button
            // En dólares se paga desde su hoja: cuántos dólares y a qué precio.
            onClick={() => (esEnDolares(p.pagoFijo) ? setEnDolares(p.pagoFijo.id) : marcarPagado(p.pagoFijo.id, mes))}
            className="h-9 rounded-full bg-marca px-4 text-[14px] font-semibold text-sobre-marca"
          >
            Pagar
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      {logro.completo ? (
        <SaldoFijo monto={logro.total} etiqueta="Pagaron todo el mes">
          <TodoPagado />
        </SaldoFijo>
      ) : (
        <>
          <SaldoFijo monto={faltan} etiqueta="Falta pagar este mes">
            <Resumen etiqueta="Falta pagar este mes" monto={faltan}>
              <div className="h-2 overflow-hidden rounded-full bg-relleno" role="img" aria-label={`Pagado ${pesos(total - faltan)} de ${pesos(total)}`}>
                <div className="h-full rounded-full bg-marca transition-[width] duration-500" style={{ width: `${total > 0 ? ((total - faltan) / total) * 100 : 0}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[14px] text-tenue tabular-nums">
                <span>
                  Pagaron {pagados.length} de {pagos.length}
                </span>
                <span>{pesos(total - faltan, { ceroComoGuion: false })} de {pesos(total, { ceroComoGuion: false })}</span>
              </div>
            </Resumen>
          </SaldoFijo>
          {pagos.length > 0 && (
            <p className="mx-5 mt-3 text-[13px] leading-5 text-tenue">Al tocar Pagar se carga el gasto a nombre de {quien}. Lo ven los dos al instante.</p>
          )}
        </>
      )}

      <main className="mt-5 space-y-5">
        {grupos
          .filter((g) => g.pagos.length > 0)
          .map((g) => (
            <Grupo key={g.titulo} titulo={g.titulo} detalle={pesos(g.pagos.reduce((a, p) => a + p.monto, 0))}>
              {g.pagos.map(fila)}
            </Grupo>
          ))}
        {pagados.length > 0 && (
          <Grupo titulo="Pagados" detalle={logro.completo ? undefined : pesos(total - faltan)}>
            {pagados.map(fila)}
          </Grupo>
        )}
        {pagos.length === 0 && (
          <div className="px-9 py-10 text-center">
            <p className="text-[15px] font-semibold">No hay pagos fijos este mes</p>
            <p className="mt-1 text-[15px] text-tenue">Se agregan desde Ajustes.</p>
          </div>
        )}
      </main>

      <Hoja abierta={!!prestamoEnDolares} alCerrar={() => setEnDolares(null)} titulo={prestamoEnDolares?.concepto ?? "Préstamo"} mostrarTitulo={false}>
        {prestamoEnDolares && <DetallePrestamo key={prestamoEnDolares.id} prestamo={prestamoEnDolares} alCerrar={() => setEnDolares(null)} />}
      </Hoja>
    </>
  );
}

/**
 * Todos los pagos fijos del mes hechos: es un logro y se festeja. Sello, cuántos y cuánto,
 * quién puso cuánto, cuántos a tiempo y cuál es el próximo (si es el mes actual).
 */
function TodoPagado() {
  const { datos, mes } = useBilletera();
  const logro = logroPagos(datos, mes);
  const nombre = nombreMes(mes).split(" ")[0];
  const esMesActual = mes === mesDe(hoy());
  const siguiente = sumarMeses(mes, 1);
  const proximo = esMesActual ? pagosDelMes(datos, siguiente)[0] : undefined;
  const cifras = [
    ...logro.porPersona.map((p) => ({
      etiqueta: `${datos.miembros.find((m) => m.id === p.miembroId)?.nombre ?? ""} pagó`,
      valor: pesos(p.monto, { ceroComoGuion: false }),
    })),
    ...(logro.conFecha > 0 ? [{ etiqueta: "A tiempo", valor: `${logro.aTiempo} de ${logro.conFecha}` }] : []),
  ];
  return (
    <section className="mx-5 mt-4 rounded-3xl superficie px-5 pb-5 pt-6 text-center shadow-tarjeta ring-1 ring-linea">
      <SelloLogro />
      <h2 className="mt-3 text-[24px] font-bold leading-tight tracking-[-0.02em]">{esMesActual ? "¡Están al día!" : "¡Pagaron todo!"}</h2>
      <p className="mt-1.5 text-[15px] leading-6 text-tenue">
        {logro.cantidad === 1 ? "El pago fijo" : `Los ${logro.cantidad} pagos fijos`} de {nombre},{" "}
        <span className="font-semibold text-texto tabular-nums">{pesos(logro.total, { ceroComoGuion: false })}</span>.
      </p>
      {cifras.length > 0 && (
        <div className="mt-5 border-t border-linea pt-4">
          <Cifras items={cifras} />
        </div>
      )}
      {proximo && (
        <p className="mt-4 rounded-2xl bg-relleno px-4 py-2.5 text-[13px] leading-5 text-tenue">
          El próximo es {proximo.pagoFijo.concepto}, el {proximo.pagoFijo.dia} de {nombreMes(siguiente).split(" ")[0]}.
        </p>
      )}
    </section>
  );
}
