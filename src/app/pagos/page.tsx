"use client";

import { Encabezado, Tarjeta } from "@/components/ui";
import { pagosDelMes } from "@/lib/calculos";
import { pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

export default function PagosFijos() {
  const { datos, mes, usuarioId, marcarPagado, desmarcarPagado } = useBilletera();
  const pagos = pagosDelMes(datos, mes);
  const faltan = pagos.filter((p) => !p.pagado).reduce((a, p) => a + p.monto, 0);
  const pagados = pagos.filter((p) => p.pagado).length;
  const quien = datos.miembros.find((m) => m.id === usuarioId)?.nombre;
  const pagadorDe = (movimientoId?: string) => {
    const mov = datos.movimientos.find((m) => m.id === movimientoId);
    return datos.miembros.find((m) => m.id === mov?.pagoPor)?.nombre;
  };

  return (
    <>
      <Encabezado titulo="Pagos fijos" />
      <main className="space-y-3 px-4 pt-4">
        <Tarjeta className="flex items-end justify-between">
          <div>
            <p className="text-sm text-tenue">Faltan pagar</p>
            <p className="text-2xl font-semibold tabular-nums">{pesos(faltan, { ceroComoGuion: false })}</p>
          </div>
          <p className="text-sm text-tenue">{pagados} de {pagos.length} pagados</p>
        </Tarjeta>

        <p className="px-1 text-xs text-tenue">
          Al marcar un pago se carga el gasto solo, como pagado por {quien}.
        </p>

        <Tarjeta className="!p-0">
          <ul className="divide-y divide-linea">
            {pagos.map((p) => (
              <li key={p.pagoFijo.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-fondo text-sm font-semibold tabular-nums text-tenue">
                  {p.pagoFijo.dia}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium ${p.pagado ? "text-tenue line-through decoration-linea" : ""}`}>
                    {p.pagoFijo.concepto}
                  </p>
                  <p className="text-xs text-tenue tabular-nums">
                    {pesos(p.monto)}
                    {p.pagoFijo.esDeuda && " · deuda"}
                    {p.pagado && pagadorDe(p.movimientoId) && ` · pagó ${pagadorDe(p.movimientoId)}`}
                  </p>
                </div>
                <button
                  onClick={() => (p.pagado ? desmarcarPagado(p.pagoFijo.id, mes) : marcarPagado(p.pagoFijo.id, mes))}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition active:scale-95 ${
                    p.pagado ? "bg-queda-suave text-queda" : "bg-marca text-white"
                  }`}
                >
                  {p.pagado ? "Pagado ✓" : "Pagar"}
                </button>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </main>
    </>
  );
}
