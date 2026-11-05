"use client";

import { Encabezado, Grupo, MontoQueda, Resumen } from "@/components/ui";
import { repartoMes } from "@/lib/calculos";
import { pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

export default function Reparto() {
  const { datos, mes } = useBilletera();
  const { previsto, miembros } = repartoMes(datos, mes);

  return (
    <>
      <Encabezado />
      <Resumen etiqueta="Gasto previsto del mes" monto={previsto}>
        <p className="text-[15px] text-tenue">
          Cada uno pone según lo que gana: {miembros.map((m) => `${m.nombre} ${Math.round(m.proporcion * 100)}%`).join(", ")}.
        </p>
      </Resumen>

      <main className="mt-6 space-y-6">
        {miembros.map((m) => {
          const d = Math.round(m.diferencia);
          return (
            <Grupo key={m.miembroId} titulo={m.nombre} detalle={`Ingresa ${pesos(m.ingresa)}`}>
              <table className="w-full text-[15px] tabular-nums">
                <thead>
                  <tr className="text-[13px] text-tenue">
                    <th className="px-5 pb-1 pt-3 text-left font-normal" />
                    <th className="pb-1 pt-3 text-right font-normal">Plan</th>
                    <th className="px-5 pb-1 pt-3 text-right font-normal">Real</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className="px-5 py-2 text-left font-normal text-tenue">Pone</th>
                    <td className="py-2 text-right font-medium">{pesos(m.leToca)}</td>
                    <td className="px-5 py-2 text-right font-medium">{pesos(m.puso)}</td>
                  </tr>
                  <tr>
                    <th className="px-5 pb-3 pt-2 text-left font-normal text-tenue">Le queda</th>
                    <td className="pb-3 pt-2 text-right font-medium">{pesos(m.leQuedaPlan)}</td>
                    <td className="px-5 pb-3 pt-2 text-right font-medium">{pesos(m.leQuedaReal)}</td>
                  </tr>
                  <tr className="border-t border-linea">
                    <th className="px-5 py-3.5 text-left font-semibold" colSpan={2}>
                      {d > 0 ? "Le falta poner" : d < 0 ? "Puso de más" : "Está al día"}
                    </th>
                    <td className="px-5 py-3.5 text-right font-semibold">
                      <MontoQueda monto={m.diferencia} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </Grupo>
          );
        })}

        <p className="px-5 text-[13px] leading-5 text-tenue">
          Durante el mes los dos suelen tener algo por poner. El número que vale es el de fin de mes: si alguien puso de más, el otro le devuelve la diferencia.
        </p>
      </main>
    </>
  );
}
