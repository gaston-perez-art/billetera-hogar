"use client";

// Ahorro (en Inicio): una reserva como las de MP, para apartar plata y que no se cuente
// como disponible. Apartar es un movimiento en la categoría Ahorro a nombre de quien usa la
// app: baja lo que tienen (y lo de esa persona), como un gasto. Retirar es el movimiento al
// revés: la plata vuelve. No hay metas ni plazos (MVP).

import { useState } from "react";
import { IconoCategoria } from "@/components/Iconos";
import { Boton, CampoMonto, Cifras, FilaLista, Hoja, MontoGrande, MontoMovimiento, TarjetaLista } from "@/components/ui";
import { ahorro, CATEGORIA_AHORRO } from "@/lib/calculos";
import { etiquetaDia, hoy, pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

type Accion = "apartar" | "retirar";

/** Fila de Inicio con lo apartado. Tocarla abre la reserva. */
export function FilaAhorro() {
  const { datos, mes } = useBilletera();
  const [abierta, setAbierta] = useState(false);
  const a = ahorro(datos, mes);
  const bajada =
    a.delMes > 0 ? `Apartaron ${pesos(a.delMes)} este mes` : a.delMes < 0 ? `Retiraron ${pesos(-a.delMes)} este mes` : a.saldo > 0 ? "Plata apartada" : "Tocá para apartar plata";
  return (
    <>
      <TarjetaLista>
        <FilaLista
          onClick={() => setAbierta(true)}
          icono={<IconoCategoria nombre={CATEGORIA_AHORRO} />}
          titulo="Ahorro"
          bajada={bajada}
          valor={pesos(a.saldo, { ceroComoGuion: false })}
        />
      </TarjetaLista>
      <Hoja abierta={abierta} alCerrar={() => setAbierta(false)} titulo="Ahorro">
        <Reserva alTerminar={() => setAbierta(false)} />
      </Hoja>
    </>
  );
}

function Reserva({ alTerminar }: { alTerminar: () => void }) {
  const { datos, usuarioId, agregarCategoria, agregarMovimiento } = useBilletera();
  const [accion, setAccion] = useState<Accion>("apartar");
  const [monto, setMonto] = useState(0);
  const [clave, setClave] = useState(0);
  const a = ahorro(datos);
  const nombre = (id: string) => datos.miembros.find((m) => m.id === id)?.nombre ?? "";
  const valido = monto > 0 && (accion === "apartar" || monto <= a.saldo);

  const confirmar = () => {
    if (!valido) return;
    const categoriaId = datos.categorias.find((c) => c.nombre === CATEGORIA_AHORRO)?.id ?? agregarCategoria(CATEGORIA_AHORRO);
    agregarMovimiento({
      fecha: hoy(),
      monto: accion === "apartar" ? monto : -monto,
      categoriaId,
      detalle: accion === "apartar" ? "Apartado para ahorro" : "Retiro del ahorro",
      pagoPor: usuarioId,
    });
    alTerminar();
  };

  const cambiar = (x: Accion) => {
    setAccion(x);
    setMonto(0);
    setClave((k) => k + 1); // vacía el campo
  };

  return (
    <div>
      <div className="text-center">
        <MontoGrande monto={a.saldo} className="text-[40px] leading-none" />
        <p className="mt-2 text-[14px] text-tenue">Tienen apartado</p>
      </div>
      {a.saldo !== 0 && (
        <div className="mt-4 rounded-2xl bg-relleno px-4 py-3 text-center">
          <Cifras items={a.porPersona.map((p) => ({ etiqueta: `Puso ${nombre(p.miembroId)}`, valor: pesos(p.monto, { ceroComoGuion: false }) }))} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 rounded-full bg-relleno p-1" role="radiogroup" aria-label="Qué querés hacer">
        {(
          [
            ["apartar", "Apartar"],
            ["retirar", "Retirar"],
          ] as [Accion, string][]
        ).map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={accion === valor}
            disabled={valor === "retirar" && a.saldo <= 0}
            onClick={() => cambiar(valor)}
            className="h-10 rounded-full text-[14px] font-semibold text-tenue disabled:opacity-40 aria-checked:bg-tarjeta aria-checked:text-texto aria-checked:shadow-tarjeta"
          >
            {texto}
          </button>
        ))}
      </div>
      <div className="py-7">
        <CampoMonto key={clave} valor={monto} onCambio={setMonto} onEnter={confirmar} etiqueta={accion === "apartar" ? "Cuánto apartás" : "Cuánto retirás"} />
        <p className={`mt-2 text-center text-[13px] leading-5 ${accion === "retirar" && monto > a.saldo ? "text-pasaste" : "text-tenue"}`}>
          {accion === "apartar"
            ? `A nombre de ${nombre(usuarioId)}. Sale de lo que tienen este mes.`
            : monto > a.saldo
              ? `Hay ${pesos(a.saldo)} apartados.`
              : "Vuelve a lo que tienen este mes."}
        </p>
      </div>
      <Boton onClick={confirmar} disabled={!valido}>
        {accion === "apartar" ? "Apartar" : "Retirar"}
        {monto > 0 ? ` ${pesos(monto)}` : ""}
      </Boton>

      {a.movimientos.length > 0 && (
        <section className="mt-6">
          <h3 className="text-[15px] font-semibold">Movimientos</h3>
          <div className="-mx-4 mt-1">
            {a.movimientos.slice(0, 12).map((m) => (
              <FilaLista
                key={m.id}
                titulo={m.monto >= 0 ? "Apartado" : "Retiro"}
                bajada={`${etiquetaDia(m.fecha)}, ${nombre(m.pagoPor)}`}
                // Desde la reserva: lo apartado entra (+), lo retirado sale (-).
                valor={<MontoMovimiento monto={-m.monto} />}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
