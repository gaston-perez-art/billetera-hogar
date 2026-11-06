"use client";

// Pagos fijos como agenda: vencidos, hoy, esta semana, más adelante y pagados.
// El tiempo se lee de arriba hacia abajo, sin descifrar un gráfico.

import { Icono, ICONOS } from "@/components/Iconos";
import { Encabezado, Fecha, Grupo, Resumen } from "@/components/ui";
import { pagosDelMes, type PagoDelMes } from "@/lib/calculos";
import { cuandoVence, diasEntre, fechaEnMes, hoy, mesCorto, mesDe, pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

export default function PagosFijos() {
  const { datos, mes, usuarioId, marcarPagado, desmarcarPagado } = useBilletera();
  const fechaHoy = hoy();
  const mesActual = mesDe(fechaHoy);
  const pagos = pagosDelMes(datos, mes);
  const pendientes = pagos.filter((p) => !p.pagado);
  const pagados = pagos.filter((p) => p.pagado);
  const faltan = pendientes.reduce((a, p) => a + p.monto, 0);
  const total = pagos.reduce((a, p) => a + p.monto, 0);
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
    const bajada = p.pagado
      ? [pesos(p.monto), pagadorDe(p.movimientoId) ? `pagó ${pagadorDe(p.movimientoId)}` : null].filter(Boolean).join(", ")
      : mes === mesActual
        ? `${pesos(p.monto)}, ${cuandoVence(d).toLowerCase()}`
        : pesos(p.monto);
    return (
      <div key={p.pagoFijo.id} className="flex min-h-16 items-center gap-3 px-5 py-2.5">
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
          <button onClick={() => marcarPagado(p.pagoFijo.id, mes)} className="h-9 rounded-full bg-marca px-4 text-[14px] font-semibold text-sobre-marca">
            Pagar
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <Encabezado titulo="Pagos fijos" />
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
      <p className="mx-5 mt-3 text-[13px] leading-5 text-tenue">Al tocar Pagar se carga el gasto a nombre de {quien}. Lo ven los dos al instante.</p>

      <main className="mt-5 space-y-5">
        {grupos
          .filter((g) => g.pagos.length > 0)
          .map((g) => (
            <Grupo key={g.titulo} titulo={g.titulo} detalle={pesos(g.pagos.reduce((a, p) => a + p.monto, 0))}>
              {g.pagos.map(fila)}
            </Grupo>
          ))}
        {pagados.length > 0 && <Grupo titulo="Pagados">{pagados.map(fila)}</Grupo>}
        {pagos.length === 0 && (
          <div className="px-9 py-10 text-center">
            <p className="text-[15px] font-semibold">No hay pagos fijos este mes</p>
            <p className="mt-1 text-[15px] text-tenue">Se agregan desde Ajustes.</p>
          </div>
        )}
        {mes === mesActual && pendientes.length === 0 && pagos.length > 0 && (
          <p className="px-5 text-center text-[15px] font-semibold text-queda">Están al día con todos los pagos del mes.</p>
        )}
      </main>
    </>
  );
}
