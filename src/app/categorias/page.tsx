"use client";

import { IconoCategoria } from "@/components/Iconos";
import { Encabezado, Grupo, MontoQueda, Resumen } from "@/components/ui";
import { categoriasDelMes } from "@/lib/calculos";
import { pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

export default function Categorias() {
  const { datos, mes } = useBilletera();
  const categorias = categoriasDelMes(datos, mes);
  const total = categorias.reduce((a, c) => ({ gastado: a.gastado + c.gastado, techo: a.techo + c.techo }), { gastado: 0, techo: 0 });
  const activas = categorias.filter((c) => c.techo !== 0 || c.gastado !== 0);
  const vacias = categorias.filter((c) => c.techo === 0 && c.gastado === 0);

  return (
    <>
      <Encabezado />
      <Resumen etiqueta="Gastado en el mes" monto={total.gastado}>
        <Barra parte={total.gastado} total={total.techo} />
        <div className="mt-2 flex justify-between text-[15px]">
          <span className="text-tenue tabular-nums">Techo {pesos(total.techo)}</span>
          <span className="text-tenue">
            {total.techo - total.gastado < 0 ? "Te pasaste " : "Disponible "}
            <MontoQueda monto={total.techo - total.gastado} className="font-semibold" />
          </span>
        </div>
      </Resumen>

      <main className="mt-6 space-y-6">
        <Grupo titulo="Por categoría">
          {activas.map(({ categoria, gastado, techo, queda }) => (
            <div key={categoria.id} className="flex items-center gap-3 px-5 py-3">
              <IconoCategoria nombre={categoria.nombre} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-medium">{categoria.nombre}</span>
                  <MontoQueda monto={queda} className="shrink-0 text-[15px] font-semibold" />
                </div>
                <Barra parte={gastado} total={techo} fina />
                <p className="mt-1.5 text-[13px] text-tenue tabular-nums">
                  {techo > 0 ? `${pesos(gastado)} de ${pesos(techo)}` : `${pesos(gastado)}, sin techo`}
                </p>
              </div>
            </div>
          ))}
        </Grupo>

        {vacias.length > 0 && (
          <p className="px-5 text-[13px] leading-5 text-tenue">
            Sin techo ni gastos este mes: {vacias.map((c) => c.categoria.nombre).join(", ")}.
          </p>
        )}
      </main>
    </>
  );
}

/** Barra de avance. Tinta mientras alcanza; rojo si se pasa. */
function Barra({ parte, total, fina = false }: { parte: number; total: number; fina?: boolean }) {
  const pasada = parte > total;
  const avance = total > 0 ? Math.min(parte / total, 1) : parte > 0 ? 1 : 0;
  return (
    <div className={`overflow-hidden rounded-full bg-relleno ${fina ? "mt-2 h-1" : "h-1.5"}`}>
      <div className={`h-full rounded-full ${pasada ? "bg-pasaste" : "bg-marca"}`} style={{ width: `${avance * 100}%` }} />
    </div>
  );
}
