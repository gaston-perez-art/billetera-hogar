"use client";

// Ajustes: lo que se toca cada tanto (sueldos, techos, pagos fijos).
// Tres secciones cerradas con su total a la vista; tocar una fila abre una hoja
// desde abajo con el monto grande y formato mientras se escribe.

import { useState } from "react";
import { Icono, ICONOS } from "@/components/Iconos";
import { Boton, CampoMonto, Encabezado, estiloBoton, Hoja, Seccion } from "@/components/ui";
import { ingresoVigente } from "@/lib/calculos";
import { nombreMes, pesos } from "@/lib/formato";
import { leerDatosImportados } from "@/lib/importar";
import { useBilletera } from "@/lib/store";
import { useTema, type Tema } from "@/lib/tema";

type Edicion =
  | { tipo: "ingreso"; id: string }
  | { tipo: "techo"; id: string }
  | { tipo: "pago"; id: string };

type Abierta = "ingresos" | "techos" | "pagos" | null;

export default function Ajustes() {
  const b = useBilletera();
  const { modo, email, datos, mes, importarDatos, reiniciarDemo, cerrarSesion } = b;
  const [tema, setTema] = useTema();
  const [abierta, setAbierta] = useState<Abierta>(null);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [avisoImportar, setAvisoImportar] = useState<{ ok: boolean; texto: string } | null>(null);

  const alternar = (s: Exclude<Abierta, null>) => setAbierta((a) => (a === s ? null : s));
  const nombre = (id: string) => datos.miembros.find((m) => m.id === id)?.nombre ?? "";
  const nombreCategoria = (id: string) => datos.categorias.find((c) => c.id === id)?.nombre ?? "";
  // Los sueldos que valen en el mes elegido (al cambiar uno, el anterior queda para los meses previos).
  const ingresos = datos.ingresos.filter((i) => i.mes === null && ingresoVigente(i, mes));
  const categorias = [...datos.categorias].sort((a, b) => a.orden - b.orden);
  const pagos = [...datos.pagosFijos].sort((a, b) => Number(b.activo) - Number(a.activo) || a.dia - b.dia);
  const activos = pagos.filter((p) => p.activo);
  const suma = (xs: number[]) => xs.reduce((a, x) => a + x, 0);

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    try {
      const nuevos = leerDatosImportados(await archivo.text());
      const pregunta =
        modo === "nube"
          ? `¿Reemplazar todos los datos del hogar con "${archivo.name}"? Lo van a ver los dos.`
          : `¿Reemplazar todo lo de este celular con "${archivo.name}"?`;
      if (!confirm(pregunta)) return;
      await importarDatos(nuevos);
      setAvisoImportar({ ok: true, texto: `Listo: ${nuevos.movimientos.length} gastos importados.` });
    } catch (error) {
      setAvisoImportar({ ok: false, texto: error instanceof Error ? error.message : "No se pudo leer el archivo." });
    }
  }

  return (
    <>
      <Encabezado titulo="Ajustes" />
      <main className="space-y-3 pb-6 pt-4">
        <Seccion
          titulo="Ingresos"
          resumen={`Entran ${pesos(suma(ingresos.map((i) => i.monto)), { ceroComoGuion: false })} por mes, en ${nombreMes(mes)}`}
          abierta={abierta === "ingresos"}
          alTocar={() => alternar("ingresos")}
        >
          {ingresos.map((i) => (
            <Fila key={i.id} titulo={i.concepto} bajada={nombre(i.miembroId)} valor={pesos(i.monto)} onClick={() => setEdicion({ tipo: "ingreso", id: i.id })} />
          ))}
          {ingresos.length === 0 && <Vacio texto="Todavía no hay ingresos cargados." />}
        </Seccion>

        <Seccion
          titulo="Techos por categoría"
          resumen={`Suman ${pesos(suma(categorias.map((c) => c.techo)), { ceroComoGuion: false })}${modo === "nube" ? `, desde ${nombreMes(mes)}` : ""}`}
          abierta={abierta === "techos"}
          alTocar={() => alternar("techos")}
        >
          <p className="px-5 pb-1 pt-2 text-[13px] leading-5 text-tenue">
            Cuánto quieren gastar como mucho por mes en cada cosa.
            {modo === "nube" && ` Si cambiás uno, vale desde ${nombreMes(mes)} en adelante.`}
          </p>
          {categorias.map((c) => (
            <Fila
              key={c.id}
              titulo={c.nombre}
              bajada={c.nombre === "Deuda" ? "Más las cuotas de deuda del mes" : undefined}
              valor={c.techo > 0 ? pesos(c.techo) : "Sin techo"}
              tenue={c.techo <= 0}
              onClick={() => setEdicion({ tipo: "techo", id: c.id })}
            />
          ))}
        </Seccion>

        <Seccion
          titulo="Pagos fijos"
          resumen={`${activos.length} por mes, ${pesos(suma(activos.map((p) => p.monto)), { ceroComoGuion: false })}`}
          abierta={abierta === "pagos"}
          alTocar={() => alternar("pagos")}
        >
          <p className="px-5 pb-1 pt-2 text-[13px] leading-5 text-tenue">Lo que se paga todos los meses. Aparecen en Pagos fijos y cuentan en lo que falta pagar.</p>
          {pagos.map((p) => (
            <Fila
              key={p.id}
              titulo={p.concepto}
              bajada={p.activo ? `Día ${p.dia}, ${nombreCategoria(p.categoriaId)}` : "Dado de baja"}
              valor={pesos(p.monto)}
              tenue={!p.activo}
              onClick={() => setEdicion({ tipo: "pago", id: p.id })}
            />
          ))}
        </Seccion>

        <section className="px-5 pt-5">
          <h2 className="text-[16px] font-semibold">Apariencia</h2>
          <div className="mt-3 grid grid-cols-3 rounded-full bg-relleno p-1" role="radiogroup" aria-label="Apariencia">
            {(
              [
                ["auto", "Automático"],
                ["claro", "Claro"],
                ["oscuro", "Oscuro"],
              ] as [Tema, string][]
            ).map(([valor, texto]) => (
              <button
                key={valor}
                role="radio"
                aria-checked={tema === valor}
                onClick={() => setTema(valor)}
                className="h-10 rounded-full text-[14px] font-semibold text-tenue aria-checked:bg-marca aria-checked:text-sobre-marca"
              >
                {texto}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-tenue">Automático usa el mismo modo que tu celular.</p>
        </section>

        <section className="space-y-3 px-5 pt-5">
          <h2 className="text-[16px] font-semibold">{modo === "nube" ? "Cuenta y datos" : "Datos"}</h2>
          <p className="text-[13px] leading-5 text-tenue">
            {modo === "nube"
              ? `Entraste como ${email}. Los datos se guardan en la nube y los ven los dos.`
              : "Modo demo: todo se guarda solo en este navegador."}
          </p>
          <label className={`${estiloBoton("secundario")} cursor-pointer`}>
            <Icono trazo={ICONOS.archivo} className="size-5" />
            Importar archivo .json
            <input type="file" accept=".json,application/json" onChange={alElegirArchivo} className="sr-only" />
          </label>
          {avisoImportar && <p className={`px-1 text-[13px] ${avisoImportar.ok ? "text-queda" : "text-pasaste"}`}>{avisoImportar.texto}</p>}
          {reiniciarDemo && (
            <Boton variante="peligro" onClick={() => confirm("¿Borrar todo y volver a los datos de demo?") && reiniciarDemo()}>
              Volver a los datos de demo
            </Boton>
          )}
          {cerrarSesion && (
            <Boton variante="peligro" onClick={() => confirm("¿Salir de la cuenta en este celular?") && cerrarSesion()}>
              Salir
            </Boton>
          )}
        </section>
      </main>

      <HojaEdicion edicion={edicion} alCerrar={() => setEdicion(null)} />
    </>
  );
}

function Fila({
  titulo,
  bajada,
  valor,
  tenue = false,
  onClick,
}: {
  titulo: string;
  bajada?: string;
  valor: string;
  tenue?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="fila flex min-h-14 w-full items-center gap-3 px-5 py-2.5 text-left">
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[15px] font-medium ${tenue ? "text-tenue" : ""}`}>{titulo}</span>
        {bajada && <span className="mt-0.5 block truncate text-[13px] text-tenue">{bajada}</span>}
      </span>
      <span className={`shrink-0 text-[15px] font-semibold tabular-nums ${tenue ? "text-tenue" : ""}`}>{valor}</span>
      <Icono trazo={ICONOS.lapiz} className="size-4 shrink-0 text-sutil" />
    </button>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="px-5 py-4 text-[14px] text-tenue">{texto}</p>;
}

/** Hoja para editar un ingreso, un techo o un pago fijo. Guarda al tocar Guardar. */
function HojaEdicion({ edicion, alCerrar }: { edicion: Edicion | null; alCerrar: () => void }) {
  const { datos, mes, modo, actualizarIngreso, actualizarTecho, actualizarPagoFijo } = useBilletera();
  const ingreso = edicion?.tipo === "ingreso" ? datos.ingresos.find((i) => i.id === edicion.id) : undefined;
  const categoria = edicion?.tipo === "techo" ? datos.categorias.find((c) => c.id === edicion.id) : undefined;
  const pago = edicion?.tipo === "pago" ? datos.pagosFijos.find((p) => p.id === edicion.id) : undefined;
  const titulo = ingreso?.concepto ?? (categoria ? `Techo de ${categoria.nombre}` : pago?.concepto ?? "Editar");

  return (
    <Hoja abierta={edicion !== null} alCerrar={alCerrar} titulo={titulo} mostrarTitulo>
      {edicion && (
        <Formulario
          // Se reinicia el borrador cada vez que se abre otra fila.
          key={`${edicion.tipo}-${edicion.id}`}
          montoInicial={ingreso?.monto ?? categoria?.techo ?? pago?.monto ?? 0}
          diaInicial={pago?.dia}
          ayuda={
            ingreso
              ? `Lo que le entra por mes a ${datos.miembros.find((m) => m.id === ingreso.miembroId)?.nombre ?? "esta persona"}. Vale desde ${nombreMes(mes)} en adelante: los meses anteriores no cambian.`
              : categoria
                ? categoria.nombre === "Deuda"
                  ? "Las cuotas de los pagos fijos marcados como deuda ya se suman solas. Acá va solo lo extra."
                  : modo === "nube"
                    ? `Vale desde ${nombreMes(mes)} en adelante. Poné 0 para dejarla sin techo.`
                    : "Poné 0 para dejarla sin techo."
                : "Lo que se paga todos los meses. El día es cuándo vence. Los meses ya pagados no cambian."
          }
          activo={pago?.activo}
          alGuardar={(monto, dia) => {
            if (ingreso) actualizarIngreso(ingreso.id, monto);
            if (categoria) actualizarTecho(categoria.id, monto);
            if (pago) actualizarPagoFijo(pago.id, { monto, ...(dia ? { dia } : {}) });
            alCerrar();
          }}
          alCambiarActivo={
            pago
              ? (activo) => {
                  // La baja vale desde el mes elegido: en los anteriores el pago sigue apareciendo.
                  actualizarPagoFijo(pago.id, { activo, bajaDesde: activo ? null : mes });
                  alCerrar();
                }
              : undefined
          }
        />
      )}
    </Hoja>
  );
}

function Formulario({
  montoInicial,
  diaInicial,
  ayuda,
  activo,
  alGuardar,
  alCambiarActivo,
}: {
  montoInicial: number;
  diaInicial?: number;
  ayuda: string;
  activo?: boolean;
  alGuardar: (monto: number, dia?: number) => void;
  alCambiarActivo?: (activo: boolean) => void;
}) {
  const { mes } = useBilletera();
  const [monto, setMonto] = useState(montoInicial);
  const [dia, setDia] = useState(diaInicial);
  const guardar = () => alGuardar(monto, dia);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <p className="text-[14px] leading-5 text-tenue">{ayuda}</p>
      <div className="py-8">
        <CampoMonto valor={monto} onCambio={setMonto} autoFocus onEnter={guardar} lapiz />
      </div>

      {dia !== undefined && (
        <div className="mb-6 flex items-center justify-between rounded-2xl bg-relleno px-4 py-3">
          <span>
            <span className="block text-[15px] font-medium">Vence el día</span>
            <span className="block text-[13px] text-tenue">De cada mes</span>
          </span>
          <span className="flex items-center gap-2">
            <button type="button" onClick={() => setDia(Math.max(1, dia - 1))} aria-label="Un día antes" className="grid size-10 place-items-center rounded-full bg-tarjeta text-[20px] font-semibold">
              -
            </button>
            <span className="w-8 text-center text-[20px] font-semibold tabular-nums" aria-live="polite">
              {dia}
            </span>
            <button type="button" onClick={() => setDia(Math.min(31, dia + 1))} aria-label="Un día después" className="grid size-10 place-items-center rounded-full bg-tarjeta">
              <Icono trazo={ICONOS.mas} className="size-5" />
            </button>
          </span>
        </div>
      )}

      <Boton type="submit">Guardar</Boton>

      {alCambiarActivo && activo !== undefined && (
        <div className="mt-3">
          {activo ? (
            <>
              <Boton
                type="button"
                variante="peligro"
                onClick={() => confirm(`¿Dar de baja este pago desde ${nombreMes(mes)}? Deja de aparecer en Pagos fijos y de contar en lo que falta pagar. Los meses anteriores no cambian.`) && alCambiarActivo(false)}
              >
                Dar de baja este pago
              </Boton>
              <p className="mt-2 text-center text-[13px] text-tenue">Por ejemplo, una deuda que ya terminaste de pagar.</p>
            </>
          ) : (
            <Boton type="button" variante="secundario" onClick={() => alCambiarActivo(true)}>
              Volver a activar
            </Boton>
          )}
        </div>
      )}
    </form>
  );
}
