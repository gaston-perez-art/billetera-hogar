"use client";

import { Avatar, Encabezado, MontoGrande, MontoQueda } from "@/components/ui";
import { repartoMes } from "@/lib/calculos";
import { pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

export default function Reparto() {
  const { datos, mes } = useBilletera();
  const { previsto, miembros } = repartoMes(datos, mes);
  const [a, b] = miembros;

  return (
    <>
      <Encabezado titulo="Quién pone qué" />
      <main className="space-y-4 px-4 pt-5">
        <section className="rounded-[28px] bg-bosque p-5 text-white">
          <p className="text-[15px] text-white/70">Gasto previsto del mes</p>
          <MontoGrande monto={previsto} className="mt-1 text-[40px] leading-none" />
          {a && b && a.ingresa + b.ingresa > 0 && (
            <>
              <div className="mt-5 flex h-2.5 gap-1">
                <span className="rounded-full bg-menta" style={{ width: `${a.proporcion * 100}%` }} />
                <span className="rounded-full bg-white/35" style={{ width: `${b.proporcion * 100}%` }} />
              </div>
              <div className="mt-2.5 flex justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-menta" />
                  {a.nombre} pone el {Math.round(a.proporcion * 100)}%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-white/35" />
                  {b.nombre} el {Math.round(b.proporcion * 100)}%
                </span>
              </div>
            </>
          )}
          <p className="mt-4 text-sm text-white/60">Por categoría, el techo o lo gastado si te pasaste. Cada uno pone según lo que gana.</p>
        </section>

        {miembros.map((m) => {
          const debe = Math.round(m.diferencia) > 0;
          return (
            <section key={m.miembroId} className="rounded-[28px] bg-tarjeta p-5">
              <div className="flex items-center gap-3">
                <Avatar nombre={m.nombre} grande />
                <div>
                  <h2 className="text-lg font-bold leading-tight">{m.nombre}</h2>
                  <p className="text-sm text-tenue tabular-nums">Ingresa {pesos(m.ingresa)}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Bloque titulo="Plan" filas={[["Le toca", m.leToca], ["Le queda", m.leQuedaPlan]]} />
                <Bloque titulo="Real" filas={[["Puso", m.puso], ["Le queda", m.leQuedaReal]]} />
              </div>

              <div className={`mt-3 flex items-center justify-between rounded-2xl px-4 py-3 ${debe ? "bg-queda-suave" : Math.round(m.diferencia) < 0 ? "bg-pasaste-suave" : "bg-fondo"}`}>
                <span className="text-sm font-semibold">{debe ? "Le falta poner" : Math.round(m.diferencia) < 0 ? "Puso de más" : "Está al día"}</span>
                <MontoQueda monto={m.diferencia} className="font-bold" />
              </div>
            </section>
          );
        })}

        <p className="px-2 pb-2 text-[13px] leading-5 text-tenue">
          Verde: todavía le falta poner esa diferencia antes de cerrar el mes. Rojo: puso de más. Durante el mes los dos suelen dar verde; el número que vale es el de fin de mes.
        </p>
      </main>
    </>
  );
}

function Bloque({ titulo, filas }: { titulo: string; filas: [string, number][] }) {
  return (
    <div className="rounded-2xl bg-fondo p-3.5">
      <p className="text-sm font-bold">{titulo}</p>
      {filas.map(([etiqueta, valor]) => (
        <div key={etiqueta} className="mt-2">
          <p className="text-xs text-tenue">{etiqueta}</p>
          <p className="font-bold tabular-nums">{pesos(valor)}</p>
        </div>
      ))}
    </div>
  );
}
