"use client";

import { useState } from "react";
import { Icono, IconoCategoria, ICONOS } from "@/components/Iconos";
import { SaldoFijo } from "@/components/SaldoFijo";
import { Cifras, Encabezado, FilaLista, Grupo, Hoja, MontoMovimiento, MontoQueda, Resumen } from "@/components/ui";
import { categoriasDelMes, gastosDe, gastosDeCategoria, pagosDelMes, planMes } from "@/lib/calculos";
import { etiquetaDia, pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";
import { useVista } from "@/lib/vista";

export default function Categorias() {
  const [vista] = useVista();
  const [abierta, setAbierta] = useState<string | null>(null);
  return (
    <>
      {vista === "mio" ? <CategoriasMias alAbrir={setAbierta} /> : <CategoriasDeLosDos alAbrir={setAbierta} />}
      <DetalleCategoria categoriaId={abierta} alCerrar={() => setAbierta(null)} />
    </>
  );
}

function CategoriasDeLosDos({ alAbrir }: { alAbrir: (id: string) => void }) {
  const { datos, mes } = useBilletera();
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
        Lo libre de cada categoría ya descuenta los pagos fijos que faltan. Sumado da lo mismo que Inicio. Tocá una para ver sus gastos.
      </p>

      <main className="mt-6 space-y-6">
        <Grupo titulo="Por categoría">
          {activas.map(({ categoria, gastado, techo, pendiente, libre }) => {
            const estado = estadoCategoria(gastado, techo, pendiente);
            return (
              <button
                key={categoria.id}
                onClick={() => alAbrir(categoria.id)}
                aria-label={`Ver los gastos de ${categoria.nombre}`}
                className="fila flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left"
              >
                <IconoCategoria nombre={categoria.nombre} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{categoria.nombre}</span>
                  <span className={`mt-0.5 block text-[13px] leading-[18px] ${estado.alerta ? "font-semibold text-pasaste" : "text-tenue"}`}>{estado.texto}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`block text-[15px] font-semibold tabular-nums ${libre < 0 ? "text-pasaste" : ""}`}>{pesos(Math.abs(libre), { ceroComoGuion: false })}</span>
                  <span className="mt-0.5 block text-[13px] text-tenue">{libre < 0 ? "faltan" : "libres"}</span>
                </span>
                <Icono trazo={ICONOS.adelante} className="-mr-1 size-4 shrink-0 text-sutil" />
              </button>
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
function CategoriasMias({ alAbrir }: { alAbrir: (id: string) => void }) {
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
              <FilaLista
                key={c.categoria.id}
                onClick={() => alAbrir(c.categoria.id)}
                icono={<IconoCategoria nombre={c.categoria.nombre} />}
                titulo={c.categoria.nombre}
                bajada={`${c.cantidad === 1 ? "1 gasto" : `${c.cantidad} gastos`}, ${Math.round(c.parte * 100)}% de lo tuyo`}
                valor={pesos(c.monto)}
              />
            ))}
          </Grupo>
        )}
      </main>
    </>
  );
}

type Orden = "recientes" | "grandes";

/**
 * Revisión de una categoría: sus gastos del mes, ordenados por fecha o por monto, y los pagos
 * fijos que todavía tiene reservados. En "Solo yo", solo lo que cargaste vos (no se mira lo ajeno).
 */
function DetalleCategoria({ categoriaId, alCerrar }: { categoriaId: string | null; alCerrar: () => void }) {
  const { datos, mes, usuarioId } = useBilletera();
  const [vista] = useVista();
  const [orden, setOrden] = useState<Orden>("recientes");
  const soloYo = vista === "mio";
  const c = categoriasDelMes(datos, mes).find((x) => x.categoria.id === categoriaId);
  const gastos = categoriaId ? gastosDeCategoria(datos, mes, categoriaId, soloYo ? usuarioId : undefined) : [];
  const lista = orden === "grandes" ? [...gastos].sort((a, b) => b.monto - a.monto) : gastos;
  const total = gastos.reduce((a, m) => a + m.monto, 0);
  const fijos = pagosDelMes(datos, mes).filter((p) => !p.pagado && p.pagoFijo.categoriaId === categoriaId);
  const miembro = (id: string) => datos.miembros.find((m) => m.id === id)?.nombre ?? "";
  const estado = c && estadoCategoria(c.gastado, c.techo, c.pendiente);

  return (
    <Hoja abierta={categoriaId !== null} alCerrar={alCerrar} titulo={c ? `Gastos de ${c.categoria.nombre}` : "Gastos de la categoría"}>
      {c && (
        <>
          <div className="flex items-center gap-3">
            <IconoCategoria nombre={c.categoria.nombre} tamano="lg" />
            <div className="min-w-0">
              <p className="truncate text-[20px] font-bold tracking-[-0.01em]">{c.categoria.nombre}</p>
              <p className={`text-[14px] ${!soloYo && estado?.alerta ? "font-semibold text-pasaste" : "text-tenue"}`}>
                {soloYo ? "Solo lo que cargaste vos" : estado?.texto}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-relleno px-4 py-3 text-center">
            <Cifras
              items={
                soloYo
                  ? [
                      { etiqueta: "Gastaste", valor: pesos(total, { ceroComoGuion: false }) },
                      { etiqueta: "Gastos", valor: gastos.length },
                    ]
                  : [
                      { etiqueta: "Gastado", valor: pesos(c.gastado, { ceroComoGuion: false }) },
                      { etiqueta: "Techo", valor: c.techo > 0 ? pesos(c.techo) : "Sin techo" },
                      { etiqueta: c.libre < 0 ? "Faltan" : "Libres", valor: <span className={c.libre < 0 ? "text-pasaste" : ""}>{pesos(Math.abs(c.libre), { ceroComoGuion: false })}</span> },
                    ]
              }
            />
          </div>

          {fijos.length > 0 && (
            <section className="mt-5">
              <h3 className="text-[15px] font-semibold">Pagos fijos que faltan</h3>
              <div className="mt-1">
                {fijos.map((p) => (
                  <div key={p.pagoFijo.id} className="flex items-center justify-between gap-3 py-2 text-[15px]">
                    <span className="min-w-0 truncate">
                      {p.pagoFijo.concepto}
                      <span className="text-tenue">, vence el {p.pagoFijo.dia}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{pesos(p.monto)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[15px] font-semibold">{gastos.length === 1 ? "1 gasto" : `${gastos.length} gastos`}</h3>
              {gastos.length > 1 && (
                <div className="flex rounded-full bg-relleno p-0.5" role="radiogroup" aria-label="Ordenar">
                  {(
                    [
                      ["recientes", "Recientes"],
                      ["grandes", "Más grandes"],
                    ] as [Orden, string][]
                  ).map(([valor, texto]) => (
                    <button
                      key={valor}
                      role="radio"
                      aria-checked={orden === valor}
                      onClick={() => setOrden(valor)}
                      className="h-9 rounded-full px-3.5 text-[13px] font-semibold text-tenue aria-checked:bg-marca aria-checked:text-sobre-marca"
                    >
                      {texto}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {gastos.length === 0 ? (
              <p className="py-6 text-center text-[15px] text-tenue">{soloYo ? "No cargaste gastos en esta categoría este mes." : "Sin gastos este mes."}</p>
            ) : (
              <div className="-mx-4 mt-1">
                {lista.map((m) => (
                  <FilaLista
                    key={m.id}
                    titulo={m.detalle || c.categoria.nombre}
                    bajada={soloYo || m.pagoPor === usuarioId ? etiquetaDia(m.fecha) : `${etiquetaDia(m.fecha)}, pagó ${miembro(m.pagoPor)}`}
                    valor={<MontoMovimiento monto={m.monto} />}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </Hoja>
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
