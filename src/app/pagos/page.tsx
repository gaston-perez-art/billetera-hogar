"use client";

import { Icono, ICONOS } from "@/components/Iconos";
import { Encabezado, Fecha, Grupo, Resumen } from "@/components/ui";
import { pagosDelMes, type PagoDelMes } from "@/lib/calculos";
import { mesCorto, pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

export default function PagosFijos() {
  const { datos, mes, usuarioId, marcarPagado, desmarcarPagado } = useBilletera();
  const pagos = pagosDelMes(datos, mes);
  const pendientes = pagos.filter((p) => !p.pagado);
  const pagados = pagos.filter((p) => p.pagado);
  const faltan = pendientes.reduce((a, p) => a + p.monto, 0);
  const quien = datos.miembros.find((m) => m.id === usuarioId)?.nombre;
  const pagadorDe = (movimientoId?: string) => {
    const mov = datos.movimientos.find((m) => m.id === movimientoId);
    return datos.miembros.find((m) => m.id === mov?.pagoPor)?.nombre;
  };

  const fila = (p: PagoDelMes) => {
    const detalle = [pesos(p.monto), p.pagoFijo.esDeuda ? "deuda" : null, p.pagado && pagadorDe(p.movimientoId) ? `pagó ${pagadorDe(p.movimientoId)}` : null]
      .filter(Boolean)
      .join(", ");
    return (
      <div key={p.pagoFijo.id} className="flex min-h-16 items-center gap-3 px-4 py-3">
        <Fecha dia={p.pagoFijo.dia} mes={mesCorto(mes)} />
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[15px] font-medium ${p.pagado ? "text-tenue" : ""}`}>{p.pagoFijo.concepto}</p>
          <p className="mt-0.5 truncate text-[13px] text-tenue tabular-nums">{detalle}</p>
        </div>
        {p.pagado ? (
          <button
            onClick={() => desmarcarPagado(p.pagoFijo.id, mes)}
            aria-label={`Desmarcar ${p.pagoFijo.concepto} como pagado`}
            className="grid size-9 place-items-center rounded-full text-queda active:bg-relleno"
          >
            <Icono trazo={ICONOS.check} className="size-5" />
          </button>
        ) : (
          <button onClick={() => marcarPagado(p.pagoFijo.id, mes)} className="h-9 rounded-lg bg-relleno px-3.5 text-[14px] font-semibold active:opacity-70">
            Pagar
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <Encabezado />
      <Resumen etiqueta="Por pagar este mes" monto={faltan}>
        <p className="text-[15px] text-tenue">
          {pagados.length} de {pagos.length} pagos hechos. Al tocar Pagar se carga el gasto a nombre de {quien}.
        </p>
      </Resumen>

      <main className="space-y-6">
        {pendientes.length > 0 && <Grupo titulo="Por pagar">{pendientes.map(fila)}</Grupo>}
        {pagados.length > 0 && <Grupo titulo="Pagados">{pagados.map(fila)}</Grupo>}
        {pagos.length === 0 && (
          <div className="px-9 py-10 text-center">
            <p className="text-[15px] font-semibold">No hay pagos fijos este mes</p>
            <p className="mt-1 text-[15px] text-tenue">Se agregan desde Ajustes.</p>
          </div>
        )}
      </main>
    </>
  );
}
