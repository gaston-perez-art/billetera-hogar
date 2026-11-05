"use client";

import { Encabezado, Fila, MontoQueda, Tarjeta } from "@/components/ui";
import { repartoMes } from "@/lib/calculos";
import { pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

export default function QuienPone() {
  const { datos, mes } = useBilletera();
  const { previsto, miembros } = repartoMes(datos, mes);
  const [a, b] = miembros;

  return (
    <>
      <Encabezado titulo="Quién pone qué" />
      <main className="space-y-3 px-4 pt-4">
        <Tarjeta>
          <p className="text-sm text-tenue">Gasto previsto del mes</p>
          <p className="text-2xl font-semibold tabular-nums">{pesos(previsto, { ceroComoGuion: false })}</p>
          <p className="mt-1 text-xs text-tenue">
            Por categoría, el techo o lo gastado si te pasaste. Cada uno pone según lo que gana.
          </p>
          {a && b && a.ingresa + b.ingresa > 0 && (
            <div className="mt-3">
              <div className="flex h-2.5 overflow-hidden rounded-full">
                <div className="bg-marca" style={{ width: `${a.proporcion * 100}%` }} />
                <div className="bg-marca/35" style={{ width: `${b.proporcion * 100}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-tenue">
                <span>{a.nombre} {Math.round(a.proporcion * 100)}%</span>
                <span>{b.nombre} {Math.round(b.proporcion * 100)}%</span>
              </div>
            </div>
          )}
        </Tarjeta>

        {miembros.map((m) => (
          <Tarjeta key={m.miembroId}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">{m.nombre}</h2>
              <span className="text-sm text-tenue tabular-nums">Ingresa {pesos(m.ingresa)}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-tenue">Plan</p>
                <Fila etiqueta="Le toca" valor={pesos(m.leToca)} />
                <Fila etiqueta="Le queda" valor={pesos(m.leQuedaPlan)} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-tenue">Real</p>
                <Fila etiqueta="Puso" valor={pesos(m.puso)} />
                <Fila etiqueta="Le queda" valor={pesos(m.leQuedaReal)} />
              </div>
            </div>
            <div
              className={`mt-3 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm ${
                Math.round(m.diferencia) < 0 ? "bg-pasaste-suave" : "bg-queda-suave"
              }`}
            >
              <span>{m.diferencia < 0 ? "Puso de más" : "Puso de menos"}</span>
              <MontoQueda monto={m.diferencia} className="font-semibold" />
            </div>
          </Tarjeta>
        ))}

        <p className="px-2 text-xs text-tenue">
          Verde: puso menos de lo que le tocaba y le debe esa diferencia al otro al cerrar el mes. Rojo: puso de más.
          Durante el mes los dos suelen dar verde; el número que vale es el de fin de mes.
        </p>
      </main>
    </>
  );
}
