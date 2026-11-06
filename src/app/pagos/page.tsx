"use client";

import { Icono, ICONOS } from "@/components/Iconos";
import { Encabezado, Fecha, Grupo, Resumen } from "@/components/ui";
import { pagosDelMes, type PagoDelMes } from "@/lib/calculos";
import { hoy, mesCorto, mesDe, pesos } from "@/lib/formato";
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
      <div key={p.pagoFijo.id} className="flex min-h-16 items-center gap-3 px-5 py-2.5">
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
          <button onClick={() => marcarPagado(p.pagoFijo.id, mes)} className="h-9 rounded-full bg-marca-suave px-4 text-[14px] font-semibold text-marca active:opacity-70">
            Pagar
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <Encabezado titulo="Pagos fijos" />
      <Resumen etiqueta="Por pagar este mes" monto={faltan}>
        <LineaDelMes mes={mes} pagos={pagos} />
        <p className="mt-4 text-[14px] text-tenue">
          {pagados.length} de {pagos.length} pagos hechos. Al tocar Pagar se carga el gasto a nombre de {quien}.
        </p>
      </Resumen>

      <main className="mt-6 space-y-6">
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

/** El mes como una línea: cada pago en su día, lleno si está pagado, y una marca en hoy. */
function LineaDelMes({ mes, pagos }: { mes: string; pagos: PagoDelMes[] }) {
  const [anio, m] = mes.split("-").map(Number);
  const dias = new Date(anio, m, 0).getDate();
  const hoyDia = mesDe(hoy()) === mes ? Number(hoy().slice(8, 10)) : null;
  const x = (dia: number) => `${((dia - 1) / (dias - 1)) * 100}%`;
  const porDia = new Map<number, PagoDelMes[]>();
  for (const p of pagos) porDia.set(p.pagoFijo.dia, [...(porDia.get(p.pagoFijo.dia) ?? []), p]);

  return (
    <div className="px-1.5 pt-1" role="img" aria-label={`Pagos del mes por día: ${pagos.filter((p) => p.pagado).length} hechos, ${pagos.filter((p) => !p.pagado).length} por hacer.`}>
      <div className="relative h-11">
        <div className="absolute inset-x-0 top-[30px] h-0.5 -translate-y-1/2 rounded-full bg-linea" />
        {hoyDia && <div className="absolute top-[30px] h-0.5 -translate-y-1/2 rounded-full bg-marca/40" style={{ left: 0, width: x(hoyDia) }} />}
        {[...porDia].map(([dia, lista]) => {
          const todosPagados = lista.every((p) => p.pagado);
          return (
            <span
              key={dia}
              className={`absolute top-[30px] grid size-3.5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ring-[3px] ring-tarjeta ${
                todosPagados ? "bg-marca" : "border-2 border-marca bg-tarjeta"
              }`}
              style={{ left: x(dia) }}
            />
          );
        })}
        {hoyDia && (
          <>
            <span className="absolute top-[22px] h-4 w-px -translate-x-1/2 bg-texto" style={{ left: x(hoyDia) }} />
            <span className="absolute top-0 -translate-x-1/2 rounded-full bg-texto px-1.5 py-px text-[10px] font-semibold text-fondo" style={{ left: x(hoyDia) }}>
              Hoy
            </span>
          </>
        )}
      </div>
      <div className="mt-0.5 flex justify-between text-[11px] text-tenue">
        <span>1 {mesCorto(mes)}</span>
        <span>
          {dias} {mesCorto(mes)}
        </span>
      </div>
      <div className="mt-3 flex justify-center gap-4 text-[12px] text-tenue">
        <span className="contents">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-marca" /> Pagado
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full border-[1.5px] border-marca" /> Falta
          </span>
        </span>
      </div>
    </div>
  );
}

