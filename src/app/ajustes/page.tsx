"use client";

// Ajustes: lo que se toca cada tanto (sueldos, techos, pagos fijos, compras en cuotas).
// Secciones cerradas con su total a la vista; tocar una fila abre una hoja
// desde abajo con el monto grande y formato mientras se escribe.

import { useEffect, useState } from "react";
import { Icono, ICONOS } from "@/components/Iconos";
import { Boton, CampoMonto, CampoNombre, Encabezado, estiloBoton, Hoja, Interruptor, Seccion } from "@/components/ui";
import { ingresoVigente, mesUltimaCuota, pagoFijoVigente, textoCuota } from "@/lib/calculos";
import { diasDelMes, fechaCorta, fechaEnMes, hoy, nombreMes, pesos, sumarMeses } from "@/lib/formato";
import { csvParaPlanilla, gastosEntre, nombreArchivo } from "@/lib/exportar";
import { leerDatosImportados } from "@/lib/importar";
import { useBilletera } from "@/lib/store";
import { useTema, type Tema } from "@/lib/tema";
import { CATEGORIAS_FIJAS, type NuevoPagoFijo } from "@/lib/operaciones";
import type { Fecha, PagoFijo } from "@/lib/tipos";

type Edicion =
  | { tipo: "ingreso"; id: string }
  | { tipo: "techo"; id: string }
  | { tipo: "pago"; id: string }
  | { tipo: "nuevoPago" }
  | { tipo: "compra"; id: string }
  | { tipo: "nuevaCompra" };

type Abierta = "ingresos" | "techos" | "pagos" | "tarjetas" | null;

export default function Ajustes() {
  const b = useBilletera();
  const { modo, email, datos, mes, importarDatos, reiniciarDemo, cerrarSesion } = b;
  const [tema, setTema] = useTema();
  const [abierta, setAbierta] = useState<Abierta>(null);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [exportando, setExportando] = useState(false);
  const [avisoImportar, setAvisoImportar] = useState<{ ok: boolean; texto: string } | null>(null);

  const alternar = (s: Exclude<Abierta, null>) => setAbierta((a) => (a === s ? null : s));
  const nombre = (id: string) => datos.miembros.find((m) => m.id === id)?.nombre ?? "";
  const nombreCategoria = (id: string) => datos.categorias.find((c) => c.id === id)?.nombre ?? "";
  // Los sueldos que valen en el mes elegido (al cambiar uno, el anterior queda para los meses previos).
  const ingresos = datos.ingresos.filter((i) => i.mes === null && ingresoVigente(i, mes));
  const categorias = [...datos.categorias].sort((a, b) => a.orden - b.orden);
  // Las compras en cuotas van en su propia sección (Tarjetas), no entre los pagos fijos.
  const pagos = datos.pagosFijos.filter((p) => !p.cuotas).sort((a, b) => Number(b.activo) - Number(a.activo) || a.dia - b.dia);
  const activos = pagos.filter((p) => p.activo);
  // Primero las que tienen cuota en el mes elegido, después las que empiezan más adelante y al final las terminadas.
  const estadoCompra = (p: PagoFijo) => (pagoFijoVigente(p, mes) ? 0 : p.activo && p.altaDesde && p.altaDesde > mes ? 1 : 2);
  const compras = datos.pagosFijos.filter((p) => p.cuotas).sort((a, b) => estadoCompra(a) - estadoCompra(b) || a.dia - b.dia);
  const comprasDelMes = compras.filter((p) => pagoFijoVigente(p, mes));
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
          <button onClick={() => setEdicion({ tipo: "nuevoPago" })} className="fila flex min-h-14 w-full items-center gap-3 px-5 py-2.5 text-left">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-linea text-marca">
              <Icono trazo={ICONOS.mas} className="size-4" />
            </span>
            <span className="text-[15px] font-medium text-marca">Agregar pago fijo</span>
          </button>
        </Seccion>

        <Seccion
          titulo="Tarjetas"
          resumen={`${comprasDelMes.length} ${comprasDelMes.length === 1 ? "cuota" : "cuotas"} en ${nombreMes(mes)}, ${pesos(suma(comprasDelMes.map((p) => p.monto)), { ceroComoGuion: false })}`}
          abierta={abierta === "tarjetas"}
          alTocar={() => alternar("tarjetas")}
        >
          <p className="px-5 pb-1 pt-2 text-[13px] leading-5 text-tenue">
            Compras en cuotas. Cada cuota aparece en Pagos fijos como deuda y deja de aparecer sola después de la última.
          </p>
          {compras.map((p) => (
            <Fila
              key={p.id}
              titulo={p.concepto}
              bajada={bajadaCompra(p, mes)}
              valor={pesos(p.monto)}
              tenue={estadoCompra(p) === 2}
              onClick={() => setEdicion({ tipo: "compra", id: p.id })}
            />
          ))}
          <button onClick={() => setEdicion({ tipo: "nuevaCompra" })} className="fila flex min-h-14 w-full items-center gap-3 px-5 py-2.5 text-left">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-linea text-marca">
              <Icono trazo={ICONOS.mas} className="size-4" />
            </span>
            <span className="text-[15px] font-medium text-marca">Agregar compra en cuotas</span>
          </button>
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
          <Boton variante="secundario" onClick={() => setExportando(true)}>
            <Icono trazo={ICONOS.exportar} className="size-5" />
            Exportar para la planilla
          </Boton>
          <label className={`${estiloBoton("secundario")} cursor-pointer`}>
            <Icono trazo={ICONOS.importar} className="size-5" />
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
      <HojaExportar abierta={exportando} alCerrar={() => setExportando(false)} />
    </>
  );
}

/** Cómo va una compra en cuotas, mirando el mes elegido. */
function bajadaCompra(p: PagoFijo, mes: string): string {
  const ultima = mesUltimaCuota(p);
  if (!p.activo && (!p.bajaDesde || p.bajaDesde <= mes)) return "Dada de baja";
  const cuota = textoCuota(p, mes);
  if (cuota && pagoFijoVigente(p, mes)) return `${cuota}, día ${p.dia}`;
  if (p.altaDesde && p.altaDesde > mes) return `${p.cuotas} cuotas desde ${nombreMes(p.altaDesde)}`;
  return ultima ? `Terminada, la última fue en ${nombreMes(ultima)}` : "Terminada";
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
  const { datos, mes, modo, actualizarIngreso, actualizarTecho, actualizarPagoFijo, agregarPagoFijo, renombrarCategoria, renombrarIngreso } = useBilletera();
  const ingreso = edicion?.tipo === "ingreso" ? datos.ingresos.find((i) => i.id === edicion.id) : undefined;
  const categoria = edicion?.tipo === "techo" ? datos.categorias.find((c) => c.id === edicion.id) : undefined;
  const pago = edicion?.tipo === "pago" ? datos.pagosFijos.find((p) => p.id === edicion.id) : undefined;
  const nuevoPago = edicion?.tipo === "nuevoPago";
  const compra = edicion?.tipo === "compra" ? datos.pagosFijos.find((p) => p.id === edicion.id) : undefined;
  const nuevaCompra = edicion?.tipo === "nuevaCompra";
  const titulo = ingreso
    ? "Editar ingreso"
    : categoria
      ? "Editar techo"
      : nuevoPago
        ? "Nuevo pago fijo"
        : nuevaCompra
          ? "Nueva compra en cuotas"
          : compra
            ? "Editar compra en cuotas"
            : "Editar pago fijo";

  return (
    <Hoja abierta={edicion !== null} alCerrar={alCerrar} titulo={titulo} mostrarTitulo>
      {(pago || nuevoPago) && edicion && (
        <FormularioPago
          key={pago ? `pago-${pago.id}` : "nuevo"}
          pago={pago}
          alGuardar={(cambios) => {
            if (pago) actualizarPagoFijo(pago.id, { concepto: cambios.concepto, monto: cambios.monto, dia: cambios.dia });
            else agregarPagoFijo(cambios);
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
      {(compra || nuevaCompra) && edicion && (
        <FormularioCompra
          key={compra ? `compra-${compra.id}` : "nueva-compra"}
          compra={compra}
          alGuardar={(cambios) => {
            if (compra) actualizarPagoFijo(compra.id, { concepto: cambios.concepto, monto: cambios.monto, dia: cambios.dia });
            else agregarPagoFijo(cambios);
            alCerrar();
          }}
          alDarDeBaja={
            compra
              ? () => {
                  actualizarPagoFijo(compra.id, { activo: false, bajaDesde: mes });
                  alCerrar();
                }
              : undefined
          }
        />
      )}
      {(ingreso || categoria) && edicion && (
        <Formulario
          // Se reinicia el borrador cada vez que se abre otra fila.
          key={ingreso ? `ingreso-${ingreso.id}` : `techo-${categoria?.id}`}
          montoInicial={ingreso?.monto ?? categoria?.techo ?? 0}
          nombreInicial={ingreso?.concepto ?? categoria?.nombre ?? ""}
          etiquetaNombre={ingreso ? "Nombre" : "Categoría"}
          nombreFijo={
            categoria && CATEGORIAS_FIJAS.includes(categoria.nombre)
              ? "Este nombre no se cambia: la app lo usa para sus cuentas."
              : undefined
          }
          ayuda={
            ingreso
              ? `Lo que le entra por mes a ${datos.miembros.find((m) => m.id === ingreso.miembroId)?.nombre ?? "esta persona"}. Vale desde ${nombreMes(mes)} en adelante: los meses anteriores no cambian.`
              : categoria
                ? categoria.nombre === "Deuda"
                  ? "Las cuotas de los pagos fijos marcados como deuda ya se suman solas. Acá va solo lo extra."
                  : modo === "nube"
                    ? `Vale desde ${nombreMes(mes)} en adelante. Poné 0 para dejarla sin techo.`
                    : "Poné 0 para dejarla sin techo."
                : ""
          }
          alGuardar={(monto, nombre) => {
            if (ingreso) {
              if (nombre !== ingreso.concepto) renombrarIngreso(ingreso.id, nombre);
              if (monto !== ingreso.monto) actualizarIngreso(ingreso.id, monto);
            }
            if (categoria) {
              if (nombre !== categoria.nombre) renombrarCategoria(categoria.id, nombre);
              if (monto !== categoria.techo) actualizarTecho(categoria.id, monto);
            }
            alCerrar();
          }}
        />
      )}
    </Hoja>
  );
}

function Formulario({
  montoInicial,
  nombreInicial,
  etiquetaNombre,
  nombreFijo,
  ayuda,
  alGuardar,
}: {
  montoInicial: number;
  nombreInicial: string;
  etiquetaNombre: string;
  /** Si viene, el nombre no se puede cambiar y se explica por qué. */
  nombreFijo?: string;
  ayuda: string;
  alGuardar: (monto: number, nombre: string) => void;
}) {
  const [monto, setMonto] = useState(montoInicial);
  const [nombre, setNombre] = useState(nombreInicial);
  const valido = nombre.trim() !== "";
  const guardar = () => valido && alGuardar(monto, nombre.trim());

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <CampoNombre etiqueta={etiquetaNombre} valor={nombre} onCambio={setNombre} fijo={nombreFijo} />
      <p className="mt-4 text-[14px] leading-5 text-tenue">{ayuda}</p>
      <div className="py-8">
        <CampoMonto valor={monto} onCambio={setMonto} onEnter={guardar} lapiz />
      </div>
      <Boton type="submit" disabled={!valido}>
        Guardar
      </Boton>
    </form>
  );
}

/**
 * Pago fijo: nombre, monto y día. Uno nuevo además elige categoría y si es deuda
 * (en uno que ya existe no se cambian: moverían los techos de los meses pasados).
 */
function FormularioPago({
  pago,
  alGuardar,
  alCambiarActivo,
}: {
  pago?: PagoFijo;
  alGuardar: (pago: NuevoPagoFijo) => void;
  alCambiarActivo?: (activo: boolean) => void;
}) {
  const { datos, mes } = useBilletera();
  const categorias = [...datos.categorias].sort((a, b) => a.orden - b.orden);
  const [concepto, setConcepto] = useState(pago?.concepto ?? "");
  const [monto, setMonto] = useState(pago?.monto ?? 0);
  const [dia, setDia] = useState(pago?.dia ?? 10);
  const [categoriaId, setCategoriaId] = useState(pago?.categoriaId ?? categorias[0]?.id ?? "");
  const [esDeuda, setEsDeuda] = useState(pago?.esDeuda ?? false);
  const valido = concepto.trim() !== "" && monto > 0 && categoriaId !== "";
  const guardar = () => valido && alGuardar({ concepto: concepto.trim(), monto, dia, categoriaId, esDeuda });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <CampoNombre etiqueta="Nombre" valor={concepto} onCambio={setConcepto} placeholder="Por ejemplo, Internet" autoFocus={!pago} />
      <p className="mt-4 text-[14px] leading-5 text-tenue">
        {pago
          ? "Lo que se paga todos los meses. El día es cuándo vence. Los meses ya pagados no cambian."
          : `Aparece en Pagos fijos desde ${nombreMes(mes)}. Los meses anteriores no cambian.`}
      </p>
      <div className="py-8">
        <CampoMonto valor={monto} onCambio={setMonto} onEnter={guardar} lapiz />
      </div>

      <div className="mb-6 divide-y divide-linea rounded-2xl bg-relleno">
        <div className="flex min-h-14 items-center justify-between px-4 py-3">
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

        {pago ? (
          <div className="flex min-h-14 items-center justify-between gap-3 px-4">
            <span className="text-[15px] font-medium">Categoría</span>
            <span className="text-[15px] text-tenue">{datos.categorias.find((c) => c.id === pago.categoriaId)?.nombre}</span>
          </div>
        ) : (
          <>
            <label className="flex min-h-14 items-center gap-3 px-4">
              <span className="shrink-0 text-[15px] font-medium">Categoría</span>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="min-w-0 flex-1 appearance-none bg-transparent text-right text-[16px] font-medium outline-none"
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <Icono trazo={ICONOS.lapiz} className="size-4 shrink-0 text-sutil" />
            </label>
            <label className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
              <span>
                <span className="block text-[15px] font-medium">Es una cuota de deuda</span>
                <span className="mt-0.5 block text-[13px] text-tenue">Se suma sola al techo de Deuda.</span>
              </span>
              <Interruptor activo={esDeuda} onCambio={setEsDeuda} />
            </label>
          </>
        )}
      </div>

      <Boton type="submit" disabled={!valido}>
        {pago ? "Guardar" : "Agregar"}
      </Boton>

      {pago && alCambiarActivo && (
        <div className="mt-3">
          {pago.activo ? (
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

/** Botones − y + con el número en el medio (día de vencimiento, cantidad de cuotas). */
function Contador({
  valor,
  min,
  max,
  onCambio,
  menos,
  mas,
}: {
  valor: number;
  min: number;
  max: number;
  onCambio: (n: number) => void;
  menos: string;
  mas: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <button type="button" onClick={() => onCambio(Math.max(min, valor - 1))} aria-label={menos} className="grid size-10 place-items-center rounded-full bg-tarjeta text-[20px] font-semibold">
        -
      </button>
      <span className="w-8 text-center text-[20px] font-semibold tabular-nums" aria-live="polite">
        {valor}
      </span>
      <button type="button" onClick={() => onCambio(Math.min(max, valor + 1))} aria-label={mas} className="grid size-10 place-items-center rounded-full bg-tarjeta">
        <Icono trazo={ICONOS.mas} className="size-5" />
      </button>
    </span>
  );
}

/**
 * Compra en cuotas con tarjeta. Nueva: qué es, valor total, cuántas cuotas, día y en qué mes cae
 * la primera (por defecto el siguiente, como llega en el resumen). Va siempre a Deuda.
 * Una que ya existe: se cambia el nombre, el valor de la cuota y el día; las cuotas no (cambiarían
 * los meses pasados). Darla de baja sirve si se canceló antes.
 */
function FormularioCompra({
  compra,
  alGuardar,
  alDarDeBaja,
}: {
  compra?: PagoFijo;
  alGuardar: (pago: NuevoPagoFijo) => void;
  alDarDeBaja?: () => void;
}) {
  const { datos, mes } = useBilletera();
  const deuda = datos.categorias.find((c) => c.nombre === "Deuda");
  const siguiente = sumarMeses(mes, 1);
  const [concepto, setConcepto] = useState(compra?.concepto ?? "");
  // Nueva: el valor total. Existente: el valor de cada cuota.
  const [monto, setMonto] = useState(compra?.monto ?? 0);
  const [cuotas, setCuotas] = useState(compra?.cuotas ?? 6);
  const [dia, setDia] = useState(compra?.dia ?? 10);
  const [primera, setPrimera] = useState(siguiente);
  const porCuota = compra ? monto : Math.round((monto / cuotas) * 100) / 100;
  const valido = concepto.trim() !== "" && monto > 0 && !!deuda;
  const guardar = () =>
    valido &&
    deuda &&
    alGuardar({ concepto: concepto.trim(), monto: porCuota, dia, categoriaId: deuda.id, esDeuda: true, cuotas, primeraCuota: primera });
  const ultima = compra ? mesUltimaCuota(compra) : sumarMeses(primera, cuotas - 1);
  const dadaDeBaja = compra && !compra.activo;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <CampoNombre etiqueta="Qué compraste" valor={concepto} onCambio={setConcepto} placeholder="Por ejemplo, Heladera" autoFocus={!compra} />
      <p className="mt-4 text-[14px] leading-5 text-tenue">
        {compra
          ? `${textoCuota(compra, mes) && pagoFijoVigente(compra, mes) ? `${textoCuota(compra, mes)} en ${nombreMes(mes)}. ` : ""}${compra.cuotas} cuotas${ultima ? `, la última en ${nombreMes(ultima)}` : ""}. Acá va el valor de cada cuota; las ya pagadas no cambian.`
          : "El valor total de la compra. Se divide en las cuotas."}
      </p>
      <div className="py-8">
        <CampoMonto valor={monto} onCambio={setMonto} onEnter={guardar} lapiz />
        {!compra && monto > 0 && (
          <p className="mt-2 text-center text-[14px] text-tenue">
            {cuotas} {cuotas === 1 ? "cuota" : "cuotas"} de {pesos(porCuota, { ceroComoGuion: false })}
          </p>
        )}
      </div>

      <div className="mb-6 divide-y divide-linea rounded-2xl bg-relleno">
        {!compra && (
          <div className="flex min-h-14 items-center justify-between px-4 py-3">
            <span className="text-[15px] font-medium">Cuotas</span>
            <Contador valor={cuotas} min={1} max={120} onCambio={setCuotas} menos="Una cuota menos" mas="Una cuota más" />
          </div>
        )}
        <div className="flex min-h-14 items-center justify-between px-4 py-3">
          <span>
            <span className="block text-[15px] font-medium">Vence el día</span>
            <span className="block text-[13px] text-tenue">Del resumen de la tarjeta</span>
          </span>
          <Contador valor={dia} min={1} max={31} onCambio={setDia} menos="Un día antes" mas="Un día después" />
        </div>
        {!compra && (
          <div className="px-4 py-3">
            <span className="block text-[15px] font-medium">Primera cuota</span>
            <div className="mt-2 grid grid-cols-2 rounded-full bg-tarjeta p-1" role="radiogroup" aria-label="Primera cuota">
              {[mes, siguiente].map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={primera === m}
                  onClick={() => setPrimera(m)}
                  className="h-10 rounded-full text-[14px] font-semibold text-tenue first-letter:uppercase aria-checked:bg-marca aria-checked:text-sobre-marca"
                >
                  {nombreMes(m)}
                </button>
              ))}
            </div>
            {ultima && <span className="mt-2 block text-[13px] text-tenue">La última, en {nombreMes(ultima)}.</span>}
          </div>
        )}
        <div className="flex min-h-14 items-center justify-between gap-3 px-4">
          <span>
            <span className="block text-[15px] font-medium">Categoría</span>
            <span className="block text-[13px] text-tenue">Se suma sola al techo de Deuda</span>
          </span>
          <span className="text-[15px] text-tenue">{deuda?.nombre ?? "Falta la categoría Deuda"}</span>
        </div>
      </div>

      <Boton type="submit" disabled={!valido}>
        {compra ? "Guardar" : "Agregar"}
      </Boton>

      {compra && alDarDeBaja && !dadaDeBaja && pagoFijoVigente(compra, mes) && (
        <div className="mt-3">
          <Boton
            type="button"
            variante="peligro"
            onClick={() => confirm(`¿Dar de baja esta compra desde ${nombreMes(mes)}? Deja de aparecer en Pagos fijos. Los meses anteriores no cambian.`) && alDarDeBaja()}
          >
            Dar de baja
          </Boton>
          <p className="mt-2 text-center text-[13px] text-tenue">Por ejemplo, si la cancelaste antes. Cuando termina, se va sola.</p>
        </div>
      )}
    </form>
  );
}

/**
 * Exportar gastos a CSV con las columnas de la hoja "Base de datos" de la planilla,
 * que queda solo para revisar. Período elegible con calendario (desde / hasta) y atajos.
 * En el celular abre el menú de compartir (guardar en Archivos, Drive, mandarlo por mail);
 * en la compu descarga el archivo.
 */
function HojaExportar({ abierta, alCerrar }: { abierta: boolean; alCerrar: () => void }) {
  const { datos, mes } = useBilletera();
  const finDeMes = (m: string) => fechaEnMes(m, diasDelMes(m));
  const [desde, setDesde] = useState<Fecha>(mes);
  const [hasta, setHasta] = useState<Fecha>(finDeMes(mes));
  const [aviso, setAviso] = useState<string | null>(null);

  // Cada vez que se abre, arranca en el mes elegido en la app.
  useEffect(() => {
    if (!abierta) return;
    setDesde(mes);
    setHasta(fechaEnMes(mes, diasDelMes(mes)));
    setAviso(null);
  }, [abierta, mes]);

  const primera = datos.movimientos.reduce<Fecha>((a, m) => (m.fecha < a ? m.fecha : a), hoy());
  const atajos: [string, Fecha, Fecha][] = [
    [nombreMes(mes), mes, finDeMes(mes)],
    [nombreMes(sumarMeses(mes, -1)), sumarMeses(mes, -1), finDeMes(sumarMeses(mes, -1))],
    ["Todo", primera, hoy() > finDeMes(mes) ? hoy() : finDeMes(mes)],
  ];
  const valido = desde <= hasta;
  const cantidad = valido ? gastosEntre(datos, desde, hasta).length : 0;

  async function exportar() {
    const nombre = nombreArchivo(desde, hasta);
    // Con BOM, para que Excel lea bien los acentos.
    const archivo = new File(["\ufeff" + csvParaPlanilla(datos, desde, hasta)], nombre, { type: "text/csv" });
    try {
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: nombre });
        alCerrar();
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    const url = URL.createObjectURL(archivo);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setAviso(`Listo: ${nombre}`);
  }

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Exportar para la planilla" mostrarTitulo>
      <p className="text-[14px] leading-5 text-tenue">
        Un archivo con las columnas de la hoja «Base de datos»: Fecha, Monto, Categoría, Detalle, Medio de pago y Pagó. En la planilla, Archivo → Importar.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {atajos.map(([texto, d, h]) => (
          <button
            key={texto}
            aria-pressed={desde === d && hasta === h}
            onClick={() => {
              setDesde(d);
              setHasta(h);
              setAviso(null);
            }}
            className="h-9 rounded-full bg-relleno px-4 text-[14px] font-semibold first-letter:uppercase text-tenue aria-pressed:bg-marca aria-pressed:text-sobre-marca"
          >
            {texto}
          </button>
        ))}
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl superficie shadow-tarjeta ring-1 ring-linea">
        {(
          [
            ["Desde", desde, setDesde],
            ["Hasta", hasta, setHasta],
          ] as [string, Fecha, (f: Fecha) => void][]
        ).map(([texto, valor, cambiar]) => (
          <label key={texto} className="flex min-h-14 items-center justify-between gap-4 px-4">
            <span className="text-[15px] text-tenue">{texto}</span>
            <input
              type="date"
              value={valor}
              onChange={(e) => {
                if (e.target.value) cambiar(e.target.value);
                setAviso(null);
              }}
              className="campo-fecha min-w-0 bg-transparent text-right font-medium outline-none"
            />
          </label>
        ))}
      </div>
      <p className={`mt-3 px-1 text-[13px] ${valido ? "text-tenue" : "text-pasaste"}`}>
        {valido
          ? `${cantidad} ${cantidad === 1 ? "gasto" : "gastos"} del ${fechaCorta(desde)} al ${fechaCorta(hasta)}.`
          : "La fecha de inicio tiene que ser antes que la del final."}
      </p>
      <div className="mt-5 space-y-2.5">
        <Boton onClick={exportar} disabled={!valido || cantidad === 0}>
          <Icono trazo={ICONOS.exportar} className="size-5" />
          Exportar
        </Boton>
        {aviso && <p className="px-1 text-center text-[13px] text-queda">{aviso}</p>}
      </div>
    </Hoja>
  );
}
