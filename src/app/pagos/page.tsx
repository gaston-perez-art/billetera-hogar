"use client";

import { Icono, ICONOS } from "@/components/Iconos";
import { Encabezado, MontoGrande } from "@/components/ui";
import { pagosDelMes, type PagoDelMes } from "@/lib/calculos";
import { mesCorto, pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

export default function PagosFijos() {
  const { datos, mes, usuarioId, marcarPagado, desmarcarPagado } = useBilletera();
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

  function Lista({ items }: { items: PagoDelMes[] }) {
    return (
      <ul className="overflow-hidden rounded-[28px] bg-tarjeta">
        {items.map((p, i) => (
          <li key={p.pagoFijo.id} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-linea" : ""}`}>
            <span className={`flex w-11 shrink-0 flex-col items-center rounded-2xl py-1.5 leading-none ${p.pagado ? "bg-fondo text-tenue" : "bg-[#f6eedd] text-[#8a5d0c]"}`}>
              <span className="text-lg font-bold tabular-nums">{p.pagoFijo.dia}</span>
              <span className="mt-0.5 text-[11px] font-semibold">{mesCorto(mes)}</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className={`truncate font-semibold ${p.pagado ? "text-tenue" : ""}`}>{p.pagoFijo.concepto}</p>
              <p className="truncate text-sm text-tenue tabular-nums">
                {pesos(p.monto)}
                {p.pagoFijo.esDeuda && ", deuda"}
                {p.pagado && pagadorDe(p.movimientoId) && `, pagó ${pagadorDe(p.movimientoId)}`}
              </p>
            </div>
            {p.pagado ? (
              <button
                onClick={() => desmarcarPagado(p.pagoFijo.id, mes)}
                aria-label={`Desmarcar ${p.pagoFijo.concepto}`}
                className="grid size-10 place-items-center rounded-full bg-queda-suave text-queda transition active:scale-95"
              >
                <Icono trazo={ICONOS.check} className="size-5" />
              </button>
            ) : (
              <button
                onClick={() => marcarPagado(p.pagoFijo.id, mes)}
                className="rounded-full bg-bosque px-4 py-2.5 text-sm font-bold text-white transition active:scale-95"
              >
                Pagar
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <Encabezado titulo="Pagos fijos" />
      <main className="space-y-6 px-4 pt-5">
        <section className="rounded-[28px] bg-bosque p-5 text-white">
          <p className="text-[15px] text-white/70">Faltan pagar</p>
          <MontoGrande monto={faltan} className="mt-1 text-[40px] leading-none" />
          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-menta" style={{ width: `${total > 0 ? ((total - faltan) / total) * 100 : 0}%` }} />
          </div>
          <div className="mt-2.5 flex justify-between text-sm">
            <span className="text-white/65">{pagados.length} de {pagos.length} pagados</span>
            <span className="font-bold">Pagado {pesos(total - faltan)}</span>
          </div>
          <p className="mt-3 text-sm text-white/55">Al tocar Pagar se carga el gasto, como pagado por {quien}.</p>
        </section>

        {pendientes.length > 0 && (
          <section>
            <h2 className="mb-2 px-1 text-lg font-bold tracking-tight">Por pagar</h2>
            <Lista items={pendientes} />
          </section>
        )}
        {pagados.length > 0 && (
          <section>
            <h2 className="mb-2 px-1 text-lg font-bold tracking-tight">Pagados</h2>
            <Lista items={pagados} />
          </section>
        )}
        {pagos.length === 0 && (
          <div className="rounded-[28px] bg-tarjeta px-6 py-10 text-center">
            <p className="font-semibold">No hay pagos fijos este mes</p>
            <p className="mt-1 text-sm text-tenue">Agregalos desde Ajustes.</p>
          </div>
        )}
      </main>
    </>
  );
}
