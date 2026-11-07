"use client";

import { IconoCategoria } from "@/components/Iconos";
import { SaldoFijo } from "@/components/SaldoFijo";
import { Cifras, Encabezado, Grupo, MontoQueda, Resumen } from "@/components/ui";
import { categoriasDelMes, gastosDe, planMes } from "@/lib/calculos";
import { pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";
import { useVista } from "@/lib/vista";

export default function Categorias() {
  const { datos, mes } = useBilletera();
  const [vista] = useVista();
  if (vista === "mio") return <CategoriasMias />;
  const categorias = categoriasDelMes(datos, mes);
  const plan = planMes(datos, mes);
  const total = categorias.reduce((a, c) => ({ gastado: a.gastado + c.gastado, techo: a.techo + c.techo }), { gastado: 0, techo: 0 });
  const activas = categorias.filter((c) => c.techo !== 0 || c.gastado !== 0);
  const vacias = categorias.filter((c) => c.techo === 0 && c.gastado === 0);

  return (
    <>
      <Encabezado titulo="Categorías" conVista />
      <SaldoFijo monto={total.gastado} etiqueta="Gastado en el mes">
        <Resumen etiqueta="Gastado en el mes" monto={total.gastado}>
          <Barra parte={total.gastado} total={total.techo} />
          <div className="mt-2 flex justify-between text-[15px]">
            <span className="text-tenue tabular-nums">Techo {pesos(total.techo)}</span>
            <span className="text-tenue">
              Para gastar <MontoQueda monto={plan.paraGastar} className="font-semibold" />
            </span>
          </div>
        </Resumen>
      </SaldoFijo>
      <p className="mx-5 mt-3 text-[13px] leading-5 text-tenue">
        Lo libre de cada categoría ya descuenta los pagos fijos que faltan. Sumado da lo mismo que Inicio.
      </p>

      <main className="mt-6 space-y-6">
        <Grupo titulo="Por categoría">
          {activas.map(({ categoria, gastado, techo, pendiente, libre }) => {
            const estado = estadoCategoria(gastado, techo, pendiente);
            return (
              <div key={categoria.id} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
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

/**
 * "Solo yo": en qué gastaste vos este mes. Los techos son de los dos, así que acá no se comparan:
 * se dice cuánto fue a cada categoría y qué parte de lo tuyo es.
 */
function CategoriasMias() {
  const { datos, mes, usuarioId } = useBilletera();
  const g = gastosDe(datos, mes, usuarioId);
  const top = g.categorias.slice(0, 4);
  return (
    <>
      <Encabezado titulo="Categorías" conVista />
      <SaldoFijo monto={g.gastado} etiqueta="Gastaste este mes">
        <Resumen etiqueta="Gastaste este mes" monto={g.gastado}>
          {g.gastado > 0 && (
            <div className="mb-4 flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="En qué se fue lo tuyo">
              {top.map((c, i) => (
                <span key={c.categoria.id} className={i === 0 ? "bg-marca" : i === 1 ? "bg-marca/60" : i === 2 ? "bg-marca/35" : "bg-sutil"} style={{ flexGrow: c.monto }} />
              ))}
              {g.categorias.length > top.length && <span className="bg-relleno" style={{ flexGrow: g.categorias.slice(top.length).reduce((a, c) => a + c.monto, 0) }} />}
            </div>
          )}
          <Cifras
            items={[
              { etiqueta: "Gastos", valor: g.cantidad },
              { etiqueta: "Más en", valor: g.categorias[0]?.categoria.nombre ?? "–" },
            ]}
          />
        </Resumen>
      </SaldoFijo>
      <p className="mx-5 mt-3 text-[13px] leading-5 text-tenue">Solo lo que cargaste vos, pagos fijos incluidos. Los techos son de los dos: se ven en la vista de la pareja.</p>

      <main className="mt-6">
        {g.categorias.length === 0 ? (
          <p className="px-9 py-10 text-center text-[15px] text-tenue">Todavía no cargaste gastos este mes.</p>
        ) : (
          <Grupo titulo="Por categoría">
            {g.categorias.map((c) => (
              <div key={c.categoria.id} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
                <IconoCategoria nombre={c.categoria.nombre} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{c.categoria.nombre}</p>
                  <p className="mt-0.5 text-[13px] text-tenue">
                    {c.cantidad === 1 ? "1 gasto" : `${c.cantidad} gastos`}, {Math.round(c.parte * 100)}% de lo tuyo
                  </p>
                </div>
                <p className="shrink-0 text-[15px] font-semibold tabular-nums">{pesos(c.monto)}</p>
              </div>
            ))}
          </Grupo>
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
