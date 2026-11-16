"use client";

// Cerrar el mes (Reparto): con lo gastado de verdad, quién le pasa a quién y cuánto, qué hacer
// con lo que sobró y un atajo a los techos del mes siguiente (`cierreDelMes`). La compensación
// se guarda como dos movimientos en "Compensación": + a nombre de quien pasa y − de quien recibe.

import Link from "next/link";
import { useState } from "react";
import { IconoCategoria } from "@/components/Iconos";
import { Boton, FilaLista, Hoja, TarjetaLista } from "@/components/ui";
import { CATEGORIA_AHORRO, CATEGORIA_COMPENSACION, cierreDelMes } from "@/lib/calculos";
import { diasDelMes, fechaEnMes, hoy, mesDe, nombreMes, pesos, sumarMeses } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

/** Desde el 25 se puede cerrar el mes en curso; los anteriores, siempre. */
const DIA_PARA_CERRAR = 25;

export function FilaCierre() {
  const { datos, mes } = useBilletera();
  const [abierta, setAbierta] = useState(false);
  const fechaHoy = hoy();
  const actual = mesDe(fechaHoy);
  if (mes > actual || (mes === actual && Number(fechaHoy.slice(8, 10)) < DIA_PARA_CERRAR) || datos.miembros.length < 2) return null;
  const c = cierreDelMes(datos, mes);
  const nombre = (id: string) => datos.miembros.find((m) => m.id === id)?.nombre ?? "";
  const nombreDelMes = nombreMes(mes).split(" ")[0];
  const bajada = c.transferencia ? `${nombre(c.transferencia.de)} le pasa ${pesos(c.transferencia.monto)} a ${nombre(c.transferencia.a)}` : "Las cuentas entre ustedes están al día";
  return (
    <>
      <TarjetaLista className="mt-4">
        <FilaLista
          onClick={() => setAbierta(true)}
          icono={<IconoCategoria nombre={CATEGORIA_COMPENSACION} />}
          titulo={<span>Cerrar <span className="capitalize">{nombreDelMes}</span></span>}
          bajada={bajada}
          valor={c.hecho ? <span className="text-[14px] font-semibold text-queda">Al día</span> : <span className="text-[14px] font-semibold text-marca">Cerrar</span>}
        />
      </TarjetaLista>
      <Hoja abierta={abierta} alCerrar={() => setAbierta(false)} titulo={`Cerrar ${nombreDelMes}`} mostrarTitulo>
        <Cierre alTerminar={() => setAbierta(false)} />
      </Hoja>
    </>
  );
}

function Cierre({ alTerminar }: { alTerminar: () => void }) {
  const { datos, mes, setMes, usuarioId, agregarMovimiento, agregarCategoria } = useBilletera();
  const c = cierreDelMes(datos, mes);
  const nombre = (id: string) => datos.miembros.find((m) => m.id === id)?.nombre ?? "";
  // Los movimientos del cierre van en el mes que se cierra: hoy, o su último día si ya pasó.
  const fechaHoy = hoy();
  const fecha = mesDe(fechaHoy) === mes ? fechaHoy : fechaEnMes(mes, diasDelMes(mes));
  const idDe = (n: string) => datos.categorias.find((x) => x.nombre === n)?.id ?? agregarCategoria(n);
  const siguiente = nombreMes(sumarMeses(mes, 1)).split(" ")[0];

  const compensar = () => {
    if (!c.transferencia) return;
    const { de, a, monto } = c.transferencia;
    const categoriaId = idDe(CATEGORIA_COMPENSACION);
    const detalle = `${nombre(de)} le pasó a ${nombre(a)} al cerrar el mes`;
    agregarMovimiento({ fecha, monto, categoriaId, detalle, pagoPor: de });
    agregarMovimiento({ fecha, monto: -monto, categoriaId, detalle, pagoPor: a });
  };
  const apartar = () => {
    if (c.sobro <= 0) return;
    agregarMovimiento({ fecha, monto: c.sobro, categoriaId: idDe(CATEGORIA_AHORRO), detalle: "Lo que sobró del mes", pagoPor: usuarioId });
  };

  const Renglon = ({ etiqueta, monto, signo = "" }: { etiqueta: string; monto: number; signo?: string }) => (
    <div className="flex items-baseline justify-between">
      <dt className="text-tenue">{etiqueta}</dt>
      <dd className="tabular-nums">
        {signo}
        {pesos(monto, { ceroComoGuion: false })}
      </dd>
    </div>
  );

  return (
    <div className="space-y-5">
      <dl className="space-y-2 rounded-3xl bg-relleno px-4 py-4 text-[15px]">
        <Renglon etiqueta="Entró" monto={c.entra + c.extra} />
        <Renglon etiqueta="Gastaron" monto={c.gastaron} signo="- " />
        <div className="flex items-baseline justify-between border-t border-linea pt-2 font-semibold">
          <dt>{c.sobro >= 0 ? "Sobró" : "Faltó"}</dt>
          <dd className={`tabular-nums ${c.sobro < 0 ? "text-pasaste" : "text-queda"}`}>{pesos(Math.abs(c.sobro), { ceroComoGuion: false })}</dd>
        </div>
      </dl>

      <section>
        <h3 className="text-[15px] font-semibold">Entre ustedes</h3>
        <p className="mt-1 text-[13px] leading-5 text-tenue">Con lo gastado de verdad, cada uno pone según lo que gana.</p>
        <dl className="mt-3 space-y-2 text-[15px]">
          {c.personas.map((p) => (
            <div key={p.miembroId} className="flex items-baseline justify-between gap-3">
              <dt className="text-tenue">
                {p.nombre} puso {pesos(p.puso, { ceroComoGuion: false })}
              </dt>
              <dd className="tabular-nums">le tocaba {pesos(p.leTocaba, { ceroComoGuion: false })}</dd>
            </div>
          ))}
        </dl>
        {c.transferencia ? (
          <div className="mt-4 space-y-3">
            <p className="text-[17px] font-semibold leading-6">
              {nombre(c.transferencia.de)} le pasa {pesos(c.transferencia.monto)} a {nombre(c.transferencia.a)}.
            </p>
            <Boton onClick={compensar}>Ya se lo pasó</Boton>
          </div>
        ) : (
          <p className="mt-4 text-[15px] font-semibold text-queda">Están al día: nadie le debe nada a nadie.</p>
        )}
      </section>

      {c.sobro > 0 && (
        <section>
          <h3 className="text-[15px] font-semibold">Lo que sobró</h3>
          <p className="mt-1 text-[13px] leading-5 text-tenue">Apartarlo en Ahorro para que no se gaste sin darse cuenta.</p>
          <Boton variante="secundario" className="mt-3" onClick={apartar}>
            Pasar {pesos(c.sobro)} a Ahorro
          </Boton>
        </section>
      )}

      <Link
        href="/ajustes"
        onClick={() => {
          setMes(sumarMeses(mes, 1));
          alTerminar();
        }}
        className="block text-center text-[15px] font-semibold text-marca"
      >
        Revisar los techos de <span className="capitalize">{siguiente}</span>
      </Link>
    </div>
  );
}
