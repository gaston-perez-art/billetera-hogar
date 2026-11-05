"use client";

import { IconoCategoria } from "@/components/Iconos";
import { Encabezado, MontoGrande, MontoQueda } from "@/components/ui";
import { categoriasDelMes } from "@/lib/calculos";
import { pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

export default function Categorias() {
  const { datos, mes } = useBilletera();
  const categorias = categoriasDelMes(datos, mes);
  const total = categorias.reduce((a, c) => ({ gastado: a.gastado + c.gastado, techo: a.techo + c.techo }), { gastado: 0, techo: 0 });
  const conMovimiento = categorias.filter((c) => c.techo !== 0 || c.gastado !== 0);
  const sinMovimiento = categorias.filter((c) => c.techo === 0 && c.gastado === 0);
  const avanceTotal = total.techo > 0 ? Math.min(total.gastado / total.techo, 1) : 0;

  return (
    <>
      <Encabezado titulo="En qué se va" />
      <main className="space-y-6 px-4 pt-5">
        <section className="rounded-[28px] bg-bosque p-5 text-white">
          <p className="text-[15px] text-white/70">Gastado este mes</p>
          <MontoGrande monto={total.gastado} className="mt-1 text-[40px] leading-none" />
          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/15">
            <div className={`h-full rounded-full ${total.gastado > total.techo ? "bg-[#ffb4a4]" : "bg-menta"}`} style={{ width: `${avanceTotal * 100}%` }} />
          </div>
          <div className="mt-2.5 flex justify-between text-sm">
            <span className="text-white/65">De {pesos(total.techo)} de techo</span>
            <span className="font-bold">
              {total.techo - total.gastado >= 0 ? `Quedan ${pesos(total.techo - total.gastado)}` : `Te pasaste ${pesos(total.gastado - total.techo)}`}
            </span>
          </div>
        </section>

        <ul className="overflow-hidden rounded-[28px] bg-tarjeta">
          {conMovimiento.map(({ categoria, gastado, techo, queda }, i) => {
            const avance = techo > 0 ? Math.min(gastado / techo, 1) : gastado > 0 ? 1 : 0;
            const pasada = Math.round(queda) < 0;
            return (
              <li key={categoria.id} className={`flex items-center gap-3 px-4 py-4 ${i > 0 ? "border-t border-linea" : ""}`}>
                <IconoCategoria nombre={categoria.nombre} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-semibold">{categoria.nombre}</span>
                    <MontoQueda monto={queda} className="shrink-0 font-bold" />
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fondo">
                    <div className={`h-full rounded-full ${pasada ? "bg-pasaste" : "bg-queda"}`} style={{ width: `${avance * 100}%` }} />
                  </div>
                  <p className="mt-1.5 text-[13px] text-tenue tabular-nums">
                    {techo > 0 ? `${pesos(gastado)} de ${pesos(techo)}` : `${pesos(gastado)} sin techo`}
                    {pasada && <span className="font-semibold text-pasaste">, te pasaste</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        {sinMovimiento.length > 0 && (
          <section>
            <h2 className="mb-2 px-1 text-sm font-semibold text-tenue">Sin techo ni gastos este mes</h2>
            <ul className="flex flex-wrap gap-2">
              {sinMovimiento.map(({ categoria }) => (
                <li key={categoria.id} className="flex items-center gap-2 rounded-full bg-tarjeta py-1.5 pl-1.5 pr-3.5 text-sm font-semibold">
                  <IconoCategoria nombre={categoria.nombre} tamano="sm" />
                  {categoria.nombre}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
