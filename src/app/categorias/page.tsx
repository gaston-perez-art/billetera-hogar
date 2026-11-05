"use client";

import { Encabezado, MontoQueda, Tarjeta } from "@/components/ui";
import { categoriasDelMes } from "@/lib/calculos";
import { pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

export default function EnQueSeVa() {
  const { datos, mes } = useBilletera();
  const categorias = categoriasDelMes(datos, mes);
  const total = categorias.reduce(
    (a, c) => ({ gastado: a.gastado + c.gastado, techo: a.techo + c.techo }),
    { gastado: 0, techo: 0 },
  );

  return (
    <>
      <Encabezado titulo="En qué se va" />
      <main className="space-y-3 px-4 pt-4">
        <Tarjeta className="flex items-end justify-between">
          <div>
            <p className="text-sm text-tenue">Gastado del total de techos</p>
            <p className="text-2xl font-semibold tabular-nums">
              {pesos(total.gastado, { ceroComoGuion: false })}
              <span className="text-base font-normal text-tenue"> / {pesos(total.techo)}</span>
            </p>
          </div>
          <MontoQueda monto={total.techo - total.gastado} className="font-semibold" />
        </Tarjeta>

        <Tarjeta className="!p-0">
          <ul className="divide-y divide-linea">
            {categorias.map(({ categoria, gastado, techo, queda }) => {
              const sinMovimiento = techo === 0 && gastado === 0;
              const avance = techo > 0 ? Math.min(gastado / techo, 1) : gastado > 0 ? 1 : 0;
              return (
                <li key={categoria.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={`font-medium ${sinMovimiento ? "text-tenue" : ""}`}>{categoria.nombre}</span>
                    <MontoQueda monto={queda} className="text-sm font-semibold" />
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fondo">
                    <div
                      className={`h-full rounded-full ${queda < 0 ? "bg-pasaste" : "bg-queda"}`}
                      style={{ width: `${avance * 100}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-tenue tabular-nums">
                    {pesos(gastado)} de {pesos(techo)}
                    {queda < 0 && <span className="text-pasaste"> · te pasaste</span>}
                  </p>
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      </main>
    </>
  );
}
