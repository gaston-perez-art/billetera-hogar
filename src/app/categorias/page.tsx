"use client";

import { IconoCategoria } from "@/components/Iconos";
import { Encabezado, Grupo, MontoQueda, Resumen } from "@/components/ui";
import { categoriasDelMes, planMes } from "@/lib/calculos";
import { pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

export default function Categorias() {
  const { datos, mes } = useBilletera();
  const categorias = categoriasDelMes(datos, mes);
  const plan = planMes(datos, mes);
  const total = categorias.reduce((a, c) => ({ gastado: a.gastado + c.gastado, techo: a.techo + c.techo }), { gastado: 0, techo: 0 });
  const activas = categorias.filter((c) => c.techo !== 0 || c.gastado !== 0);
  const vacias = categorias.filter((c) => c.techo === 0 && c.gastado === 0);

  return (
    <>
      <Encabezado titulo="Categorías" />
      <Resumen etiqueta="Gastado en el mes" monto={total.gastado}>
        <Barra parte={total.gastado} total={total.techo} />
        <div className="mt-2 flex justify-between text-[15px]">
          <span className="text-tenue tabular-nums">Techo {pesos(total.techo)}</span>
          <span className="text-tenue">
            Para gastar <MontoQueda monto={plan.paraGastar} className="font-semibold" />
          </span>
        </div>
      </Resumen>
      <p className="mx-5 mt-3 text-[13px] leading-5 text-tenue">
        Lo libre de cada categoría ya descuenta los pagos fijos que faltan. Sumado da lo mismo que Inicio.
      </p>

      <main className="mt-6 space-y-6">
        <Grupo titulo="Por categoría">
          {activas.map(({ categoria, gastado, techo, pendiente, libre }) => {
            const estado = estadoCategoria(gastado, techo, pendiente);
            return (
              <div key={categoria.id} className="flex min-h-16 items-center gap-3 px-5 py-2.5">
                <IconoCategoria nombre={categoria.nombre} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{categoria.nombre}</p>
                  <p className={`mt-0.5 text-[13px] leading-[18px] ${estado.alerta ? "font-semibold text-pasaste" : "text-tenue"}`}>{estado.texto}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-[15px] font-semibold tabular-nums ${libre < 0 ? "text-pasaste" : ""}`}>{pesos(Math.abs(libre), { ceroComoGuion: false })}</p>
                  <p className="mt-0.5 text-[13px] text-tenue">{libre < 0 ? "faltan" : "libres"}</p>
                </div>
              </div>
            );
          })}
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

/** Barra de avance de la tarjeta de arriba (el único gráfico de la pantalla). Rojo si se pasa. */
function Barra({ parte, total }: { parte: number; total: number }) {
  const pasada = parte > total;
  const avance = total > 0 ? Math.min(parte / total, 1) : parte > 0 ? 1 : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-relleno">
      <div className={`h-full rounded-full ${pasada ? "bg-pasaste" : "bg-marca"}`} style={{ width: `${avance * 100}%` }} />
    </div>
  );
}

/**
 * El estado de una categoría con palabras, en lugar de una barra. Si tiene pagos fijos
 * sin pagar, lo dice: esa plata ya está comprometida y no cuenta como libre.
 */
function estadoCategoria(gastado: number, techo: number, pendiente: number): { texto: string; alerta: boolean } {
  const fijos = pendiente > 0 ? `, reservado ${pesos(pendiente)} para fijos` : "";
  if (techo <= 0) return { texto: `${pesos(gastado, { ceroComoGuion: false })} gastado, sin techo`, alerta: false };
  if (gastado > techo) return { texto: `Te pasaste ${pesos(gastado - techo)} del techo`, alerta: true };
  if (techo - gastado < pendiente) return { texto: `No alcanza para los pagos fijos que faltan`, alerta: true };
  const uso = Math.round((gastado / techo) * 100);
  if (gastado <= 0) return { texto: `Sin gastos todavía${fijos}`, alerta: false };
  if (uso >= 80) return { texto: `Ojo, usaron el ${uso}%${fijos}`, alerta: false };
  return { texto: pendiente > 0 ? `Usaron el ${uso}%${fijos}` : `Usaron el ${uso}% de ${pesos(techo)}`, alerta: false };
}
