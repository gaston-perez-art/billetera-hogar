"use client";

// Comparar con el banco (Inicio): de vez en cuando, poner cuánto tienen en sus cuentas y la app
// dice si falta cargar algo desde la última vez (`lib/banco.ts`). Lo que falte se carga en
// "Sin anotar" con un toque. El punto de partida se guarda en este celular.

import { useEffect, useState } from "react";
import { IconoCategoria } from "@/components/Iconos";
import { Boton, CampoMonto, FilaLista, Hoja, TarjetaLista } from "@/components/ui";
import { acumuladoApp, comparar, guardarPunto, leerPunto, type PuntoBanco } from "@/lib/banco";
import { CATEGORIA_SIN_ANOTAR } from "@/lib/calculos";
import { diasEntre, fechaCorta, hoy, mesDe, pesos } from "@/lib/formato";
import { useBilletera } from "@/lib/store";

const CADA = 7;

/** La fila de Inicio: aparece solo cuando toca comparar (nunca se hizo o pasaron 7 días). */
export function FilaBanco() {
  const { mes } = useBilletera();
  const [abierta, setAbierta] = useState(false);
  const [punto, setPunto] = useState<PuntoBanco | null>(null);
  const [leido, setLeido] = useState(false);
  // Se lee después de montar: leerlo al dibujar haría que la página generada no coincida.
  useEffect(() => {
    setPunto(leerPunto());
    setLeido(true);
  }, [abierta]);
  if (!leido || mes !== mesDe(hoy())) return null;
  const dias = punto ? diasEntre(punto.fecha, hoy()) : null;
  // Se deja ver mientras la hoja está abierta, para que no desaparezca al guardar.
  if (!abierta && dias !== null && dias < CADA) return null;
  return (
    <>
      <TarjetaLista>
        <FilaLista
          onClick={() => setAbierta(true)}
          icono={<IconoCategoria nombre="Banco" />}
          titulo="Comparar con el banco"
          bajada={dias === null ? "Fijate si falta cargar algo" : `La última vez fue hace ${dias} días`}
          valor={<span className="text-[14px] font-semibold text-marca">Comparar</span>}
        />
      </TarjetaLista>
      <HojaBanco abierta={abierta} alCerrar={() => setAbierta(false)} />
    </>
  );
}

/** La hoja para comparar. También se abre desde "Ver la cuenta" en Inicio. */
export function HojaBanco({ abierta, alCerrar }: { abierta: boolean; alCerrar: () => void }) {
  const [punto, setPunto] = useState<PuntoBanco | null>(null);
  const [listo, setListo] = useState<null | "partida" | "ajustado" | "coincide">(null);
  useEffect(() => {
    if (abierta) {
      setPunto(leerPunto());
      setListo(null);
    }
  }, [abierta]);
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Comparar con el banco" mostrarTitulo>
      {listo ? (
        <div className="space-y-4">
          <p className="text-[17px] font-semibold leading-6 text-queda">
            {listo === "partida" ? "Listo, guardé el punto de partida." : listo === "coincide" ? "Listo: está todo cargado." : "Listo: cargué la diferencia en Sin anotar."}
          </p>
          <p className="text-[14px] leading-5 text-tenue">
            {listo === "partida"
              ? `La próxima vez que compares te digo si falta cargar algo. En ${CADA} días te lo recuerdo acá en Inicio.`
              : `En ${CADA} días te lo recuerdo acá en Inicio.`}
          </p>
          <Boton onClick={alCerrar}>Entendido</Boton>
        </div>
      ) : (
        <Comparar
          punto={punto}
          alTerminar={(p, como) => {
            if (p) guardarPunto(p);
            if (como) setListo(como);
            else alCerrar();
          }}
        />
      )}
    </Hoja>
  );
}

function Comparar({
  punto,
  alTerminar,
}: {
  punto: PuntoBanco | null;
  alTerminar: (p: PuntoBanco | null, como?: "partida" | "ajustado" | "coincide") => void;
}) {
  const { datos, usuarioId, agregarMovimiento, agregarCategoria } = useBilletera();
  const [cuentas, setCuentas] = useState(0);
  const [tarjetas, setTarjetas] = useState(0);
  const fecha = hoy();
  const banco = cuentas - tarjetas;
  const app = acumuladoApp(datos, fecha);
  const r = punto && cuentas > 0 ? comparar(punto, banco, app) : null;

  const ajustar = () => {
    if (!r) return;
    const categoriaId = datos.categorias.find((c) => c.nombre === CATEGORIA_SIN_ANOTAR)?.id ?? agregarCategoria(CATEGORIA_SIN_ANOTAR);
    // Faltan gastos: un gasto por la diferencia. Entró plata: un monto negativo (plata que entra).
    agregarMovimiento({ fecha, monto: -r.diferencia, categoriaId, detalle: `Diferencia con el banco desde el ${fechaCorta(punto!.fecha)}`, pagoPor: usuarioId });
    alTerminar({ fecha, banco, app: app + r.diferencia }, "ajustado");
  };

  return (
    <div className="space-y-4">
      <p className="text-[14px] leading-5 text-tenue">
        Sumá lo que tienen hoy entre los dos: bancos, billeteras virtuales, efectivo y lo apartado. Y lo que deben de tarjetas, consumos que todavía no pagaron.
      </p>
      <div className="rounded-3xl bg-relleno px-4 py-4 text-center">
        <p className="text-[13px] text-tenue">Tienen en sus cuentas</p>
        <div className="mt-1">
          <CampoMonto valor={cuentas} onCambio={setCuentas} chico etiqueta="Tienen en sus cuentas" />
        </div>
        <p className="mt-4 text-[13px] text-tenue">Deben de tarjetas</p>
        <div className="mt-1">
          <CampoMonto valor={tarjetas} onCambio={setTarjetas} chico etiqueta="Deben de tarjetas" />
        </div>
      </div>

      {!punto ? (
        <>
          <p className="text-[14px] leading-5">Es la primera vez: esto queda como punto de partida. La próxima te digo si falta cargar algo.</p>
          <Boton disabled={cuentas <= 0} onClick={() => alTerminar({ fecha, banco, app }, "partida")}>
            Guardar punto de partida
          </Boton>
        </>
      ) : !r ? (
        <p className="text-[13px] text-tenue">La última vez fue el {fechaCorta(punto.fecha)}. Poné cuánto tienen hoy para comparar.</p>
      ) : r.coincide ? (
        <>
          <p className="text-[15px] font-semibold text-queda">Coincide: está todo cargado desde el {fechaCorta(punto.fecha)}.</p>
          <Boton onClick={() => alTerminar({ fecha, banco, app }, "coincide")}>Listo</Boton>
        </>
      ) : (
        <>
          <p className="text-[15px] font-semibold leading-6">
            {r.diferencia < 0
              ? `Faltan cargar unos ${pesos(-r.diferencia)} de gastos desde el ${fechaCorta(punto.fecha)}.`
              : `Entraron ${pesos(r.diferencia)} que no están cargados desde el ${fechaCorta(punto.fecha)}.`}
          </p>
          <p className="text-[13px] leading-5 text-tenue">
            Si todavía no cobraron el sueldo de este mes, esperá a cobrarlo: la app ya lo cuenta desde el día 1.
          </p>
          <Boton onClick={ajustar}>
            {r.diferencia < 0 ? `Cargar ${pesos(-r.diferencia)} como gasto sin anotar` : `Cargar ${pesos(r.diferencia)} como plata que entró`}
          </Boton>
          <Boton variante="secundario" onClick={() => alTerminar(null)}>
            Los cargo yo
          </Boton>
        </>
      )}
    </div>
  );
}
