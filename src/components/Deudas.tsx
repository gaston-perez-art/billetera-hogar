"use client";

// Lo que deben entre tarjetas y préstamos (Pagos → Tarjetas y Préstamos): cerrado muestra
// lo de este mes y el total; abierto, cada parte y mes por mes mientras haya cuotas.
// Sin barras: las listas dicen el estado con palabras (CLAUDE.md, un solo gráfico por pantalla).

import { useState } from "react";
import { FilaLista, Seccion } from "@/components/ui";
import { deudas } from "@/lib/calculos";
import { dolares, nombreMes, pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

export function LoQueDeben() {
  const { datos, mes } = useBilletera();
  const [abierta, setAbierta] = useState(false);
  const d = deudas(datos, mes);
  const delMes = d.delMes.tarjetas + d.delMes.prestamos;
  const resta = d.resta.tarjetas + d.resta.prestamos;
  if (delMes === 0 && resta === 0) return null;
  const nombre = nombreMes(mes).split(" ")[0];
  const conCuotas = d.porMes.filter((m) => m.tarjetas + m.prestamos > 0);

  return (
    <Seccion
      titulo="Lo que deben"
      resumen={`En ${nombre}, ${pesos(delMes, { ceroComoGuion: false })}. En total, ${pesos(resta, { ceroComoGuion: false })}`}
      abierta={abierta}
      alTocar={() => setAbierta(!abierta)}
    >
      <FilaLista titulo="Tarjetas" bajada={`En ${nombre}, ${pesos(d.delMes.tarjetas, { ceroComoGuion: false })}`} valor={pesos(d.resta.tarjetas, { ceroComoGuion: false })} valorBajada="Resta" />
      <FilaLista
        titulo="Préstamos"
        bajada={`En ${nombre}, ${pesos(d.delMes.prestamos, { ceroComoGuion: false })}`}
        valor={pesos(d.resta.prestamos, { ceroComoGuion: false })}
        valorBajada={d.usd > 0 ? `Resta, con ${dolares(d.usd)}` : "Resta"}
      />
      {conCuotas.length > 0 && (
        <>
          <p className="px-4 pb-1 pt-4 text-[15px] font-semibold">Mes por mes</p>
          {conCuotas.map((m) => (
            <FilaLista
              key={m.mes}
              titulo={<span className="capitalize">{nombreMes(m.mes)}</span>}
              bajada={`Tarjetas ${pesos(m.tarjetas, { ceroComoGuion: false })}, préstamos ${pesos(m.prestamos, { ceroComoGuion: false })}`}
              valor={pesos(m.tarjetas + m.prestamos)}
            />
          ))}
        </>
      )}
      <p className="px-4 pb-3 pt-2 text-[13px] leading-5 text-tenue">
        Cuotas pagadas o no. Lo que resta cuenta desde {nombre}. Los préstamos en dólares van al último dólar que usaron; los UVA, con la última cuota.
      </p>
    </Seccion>
  );
}
