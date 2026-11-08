"use client";

// Préstamos (pestaña dentro de Pagos). Un préstamo es un pago fijo en cuotas sin tarjeta:
// aparece en Fijos con "Cuota 5 de 36" y se deja de mostrar solo después de la última.
// Los que se ajustan por UVA cambian de monto cada mes: con la TNA y los TyC no se llega
// al monto exacto (el banco suma IVA sobre el interés y otros cargos), así que la cuota de
// cada mes se copia del banco al pagar. La app usa la última como estimado de las que vienen.
// Los préstamos en dólares (`usdTotal`, `usdCuota`) se pagan en pesos al dólar del día: al pagar
// se carga cuántos dólares se pusieron (el mínimo o más, y lo de más se descuenta de lo que
// deben) y a qué precio. Ese dólar queda como estimado en pesos de las cuotas que vienen.
// Nunca se guarda el número de préstamo ni el de la cuenta.

import { useState } from "react";
import { LoQueDeben } from "@/components/Deudas";
import { IconoCategoria } from "@/components/Iconos";
import { Boton, CampoMonto, CampoNombre, Cifras, Contador, Dato, FilaLista, Grupo, Hoja, Interruptor, Resumen } from "@/components/ui";
import {
  cuotaDelMes,
  cuotasEnDolares,
  dolaresPagados,
  dolaresPorMes,
  dolarEstimado,
  esEnDolares,
  mesesEntre,
  mesUltimaCuota,
  pagoFijoVigente,
  pagosDelMes,
  restaDeCompra,
  saldoDolares,
  textoCuota,
} from "@/lib/calculos";
import { useDolarBlue } from "@/lib/dolar";
import { dolares, nombreMes, pesos, sumarMeses } from "@/lib/formato";
import type { CambiosPagoFijo } from "@/lib/operaciones";
import { useBilletera } from "@/lib/store";
import type { Mes, PagoFijo } from "@/lib/tipos";

type Edicion = { tipo: "ver"; id: string } | { tipo: "editar"; id: string } | { tipo: "nuevo" };

/** Cómo va en el mes: 0 = tiene cuota, 1 = empieza más adelante, 2 = terminado o de baja. */
function estado(p: PagoFijo, mes: Mes) {
  return pagoFijoVigente(p, mes) ? 0 : p.activo && p.altaDesde && p.altaDesde > mes ? 1 : 2;
}

export function VistaPrestamos() {
  const { datos, mes } = useBilletera();
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const prestamos = datos.pagosFijos.filter((p) => p.prestamo).sort((a, b) => estado(a, mes) - estado(b, mes) || a.dia - b.dia);
  const delMes = pagosDelMes(datos, mes).filter((p) => p.pagoFijo.prestamo);
  const totalMes = delMes.reduce((a, p) => a + p.monto, 0);
  const resta = prestamos.reduce((a, p) => a + restaDeCompra(datos, p, mes).monto, 0);
  const vigentes = prestamos.filter((p) => estado(p, mes) < 2);
  const terminados = prestamos.filter((p) => estado(p, mes) === 2);
  const hayUva = vigentes.some((p) => p.uva || esEnDolares(p));
  const elegido = edicion && edicion.tipo !== "nuevo" ? datos.pagosFijos.find((p) => p.id === edicion.id) : undefined;
  const cerrar = () => setEdicion(null);

  const fila = (p: PagoFijo) => {
    const pago = delMes.find((x) => x.pagoFijo.id === p.id);
    const r = restaDeCompra(datos, p, mes);
    const bajada =
      estado(p, mes) === 2
        ? `Terminó en ${nombreMes(mesUltimaCuota(p) ?? mes)}`
        : estado(p, mes) === 1
          ? `${p.cuotas} cuotas desde ${nombreMes(p.altaDesde!)}`
          : [textoCuota(p, mes), esEnDolares(p) ? `deben ${dolares(saldoDolares(datos, p))}` : null].filter(Boolean).join(", ");
    return (
      <FilaLista
        key={p.id}
        onClick={() => setEdicion({ tipo: "ver", id: p.id })}
        icono={<IconoCategoria nombre="Deuda" />}
        titulo={p.concepto}
        bajada={bajada}
        valor={pago ? pesos(pago.monto) : undefined}
        valorBajada={pago ? (pago.pagado ? "Pagada" : `Vence el ${p.dia}`) : r.cuotas > 0 ? `Resta ${pesos(r.monto)}` : undefined}
        apagada={estado(p, mes) === 2}
      />
    );
  };

  return (
    <>
      <Resumen etiqueta={`Cuotas de préstamos en ${nombreMes(mes).split(" ")[0]}`} monto={totalMes}>
        <Cifras
          items={[
            { etiqueta: "Préstamos", valor: vigentes.length },
            { etiqueta: hayUva ? "Resta, aprox." : "Resta", valor: pesos(resta, { ceroComoGuion: false }) },
          ]}
        />
      </Resumen>
      <p className="mx-5 mt-3 text-[13px] leading-5 text-tenue">
        Las cuotas se pagan desde acá o desde Fijos. Si se ajusta por UVA, la cuota sube cada mes: copiá la que te muestra el banco al pagar. Si es en dólares, cargá cuántos pusieron y a qué precio.
      </p>

      <main className="mt-5 space-y-5">
        <LoQueDeben />
        {vigentes.length > 0 && <Grupo titulo="Préstamos">{vigentes.map(fila)}</Grupo>}
        {vigentes.length === 0 && (
          <div className="px-9 py-6 text-center">
            <p className="text-[15px] font-semibold">Sin préstamos</p>
            <p className="mt-1 text-[15px] text-tenue">Si ya lo tenías como pago fijo, al agregarlo elegí cuál reemplaza.</p>
          </div>
        )}
        <div className="px-5">
          <Boton variante="secundario" onClick={() => setEdicion({ tipo: "nuevo" })}>
            Agregar préstamo
          </Boton>
        </div>
        {terminados.length > 0 && <Grupo titulo="Terminados">{terminados.map(fila)}</Grupo>}
      </main>

      <Hoja abierta={edicion !== null} alCerrar={cerrar} titulo={edicion?.tipo === "nuevo" ? "Nuevo préstamo" : elegido?.concepto ?? "Préstamo"} mostrarTitulo={edicion?.tipo !== "ver"}>
        {edicion?.tipo === "ver" && elegido && <DetallePrestamo key={elegido.id} prestamo={elegido} alEditar={() => setEdicion({ tipo: "editar", id: elegido.id })} alCerrar={cerrar} />}
        {edicion?.tipo === "editar" && elegido && <FormularioPrestamo key={`e-${elegido.id}`} prestamo={elegido} alTerminar={cerrar} />}
        {edicion?.tipo === "nuevo" && <FormularioPrestamo key="nuevo" alTerminar={cerrar} />}
      </Hoja>
    </>
  );
}

/** El préstamo y su cuota del mes: se copia el monto del banco y se paga desde acá. */
export function DetallePrestamo({ prestamo: p, alEditar, alCerrar }: { prestamo: PagoFijo; alEditar?: () => void; alCerrar: () => void }) {
  if (esEnDolares(p)) return <DetalleEnDolares prestamo={p} alEditar={alEditar} alCerrar={alCerrar} />;
  return <DetalleEnPesos prestamo={p} alEditar={alEditar} alCerrar={alCerrar} />;
}

function DetalleEnPesos({ prestamo: p, alEditar, alCerrar }: { prestamo: PagoFijo; alEditar?: () => void; alCerrar: () => void }) {
  const { datos, mes, marcarPagado, actualizarPagoFijo } = useBilletera();
  const pago = pagosDelMes(datos, mes).find((x) => x.pagoFijo.id === p.id);
  const [monto, setMonto] = useState(pago?.monto ?? p.monto);
  const r = restaDeCompra(datos, p, mes);
  const ultima = mesUltimaCuota(p);
  const nombre = nombreMes(mes).split(" ")[0];

  const pagar = () => {
    if (!pago || pago.pagado || monto <= 0) return;
    marcarPagado(p.id, mes, monto);
    // La última cuota conocida queda como estimado de las que vienen.
    if (monto !== p.monto) actualizarPagoFijo(p.id, { monto });
    alCerrar();
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <IconoCategoria nombre="Deuda" tamano="lg" />
        <div className="min-w-0">
          <p className="truncate text-[20px] font-bold tracking-[-0.01em]">{p.concepto}</p>
          <p className="text-[14px] text-tenue">{[textoCuota(p, mes) ?? "Sin cuota este mes", p.uva ? "ajusta por UVA" : null].filter(Boolean).join(", ")}</p>
        </div>
      </div>

      {pago && !pago.pagado && (
        <section className="mt-6">
          <p className="text-center text-[14px] text-tenue">
            {p.uva ? `Cuota de ${nombre}, como figura en el banco` : `Cuota de ${nombre}`}
          </p>
          <div className="py-5">
            <CampoMonto valor={monto} onCambio={setMonto} onEnter={pagar} lapiz />
          </div>
          {p.uva && <p className="-mt-1 mb-4 text-center text-[13px] leading-5 text-tenue">Arranca con la del mes pasado. Si el banco ya la publicó, corregila antes de pagar.</p>}
          <Boton onClick={pagar} disabled={monto <= 0}>
            Pagar cuota de {nombre}
          </Boton>
        </section>
      )}
      {pago?.pagado && (
        <p className="mt-6 rounded-2xl bg-marca-suave px-4 py-3 text-center text-[15px] font-medium text-marca">
          Cuota de {nombre} pagada, {pesos(pago.monto)}
        </p>
      )}

      <dl className="mt-5 divide-y divide-linea">
        <Dato etiqueta="Vence el día" valor={p.dia} />
        <Dato etiqueta="Cuotas que faltan" valor={r.cuotas} />
        <Dato etiqueta={p.uva ? "Resta, aprox." : "Resta"} valor={pesos(r.monto, { ceroComoGuion: false })} />
        {ultima && <Dato etiqueta="Última cuota" valor={<span className="capitalize">{nombreMes(ultima)}</span>} />}
      </dl>
      {p.uva && <p className="mt-1 text-[13px] leading-5 text-tenue">Lo que resta está calculado con la última cuota. Con la UVA va a ser más.</p>}

      {alEditar && (
        <div className="mt-5">
          <Boton variante="secundario" onClick={alEditar}>
            Editar datos
          </Boton>
        </div>
      )}
    </div>
  );
}

/**
 * Préstamo en dólares: al pagar se carga cuántos dólares pusieron (el mínimo o más) y a qué
 * precio. Lo de más se descuenta de lo que deben y termina antes.
 */
function DetalleEnDolares({ prestamo: p, alEditar, alCerrar }: { prestamo: PagoFijo; alEditar?: () => void; alCerrar: () => void }) {
  const { datos, mes, marcarPagado, actualizarPagoFijo } = useBilletera();
  const blue = useDolarBlue();
  const pago = pagosDelMes(datos, mes).find((x) => x.pagoFijo.id === p.id);
  const registro = datos.pagosMes.find((x) => x.pagoFijoId === p.id && x.mes === mes);
  const cuotaUsd = p.usdCuota ?? 0;
  const saldo = saldoDolares(datos, p);
  const minimo = Math.min(cuotaUsd, saldo);
  const [usd, setUsd] = useState(dolaresPorMes(datos, p).get(mes) ?? minimo);
  const [dolarCargado, setDolarCargado] = useState<number | null>(null);
  const dolar = dolarCargado ?? blue?.venta ?? Math.round(dolarEstimado(p));
  const enPesos = Math.round(usd * dolar);
  const dolarHoy = blue?.venta ?? dolarEstimado(p);
  const r = restaDeCompra(datos, p, mes);
  const ultima = mesUltimaCuota(p);
  const nombre = nombreMes(mes).split(" ")[0];
  const pagados = datos.pagosMes.filter((x) => x.pagoFijoId === p.id && x.pagado).sort((a, b) => b.mes.localeCompare(a.mes));
  const valido = usd > 0 && usd <= saldo && dolar > 0;

  const pagar = () => {
    if (!pago || pago.pagado || !valido) return;
    marcarPagado(p.id, mes, enPesos, usd);
    // El dólar de este pago queda como estimado de las cuotas que vienen.
    const monto = Math.round(cuotaUsd * dolar);
    if (monto !== p.monto) actualizarPagoFijo(p.id, { monto });
    alCerrar();
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <IconoCategoria nombre="Deuda" tamano="lg" />
        <div className="min-w-0">
          <p className="truncate text-[20px] font-bold tracking-[-0.01em]">{p.concepto}</p>
          <p className="text-[14px] text-tenue">{[textoCuota(p, mes) ?? "Sin cuota este mes", "en dólares"].join(", ")}</p>
        </div>
      </div>

      {pago && !pago.pagado && saldo > 0 && (
        <section className="mt-6">
          <p className="text-center text-[14px] text-tenue">¿Cuántos dólares ponen en {nombre}?</p>
          <div className="py-5">
            <CampoMonto valor={usd} onCambio={setUsd} onEnter={pagar} moneda="US$" etiqueta="Dólares" lapiz />
          </div>
          <p className={`-mt-1 mb-5 text-center text-[13px] leading-5 ${usd > saldo || (usd > 0 && usd < minimo) ? "text-pasaste" : "text-tenue"}`}>
            {usd > saldo
              ? `Deben ${dolares(saldo)}: no pueden poner más que eso.`
              : usd > minimo
                ? `Adelantan ${dolares(usd - minimo)}: se descuenta de lo que deben y termina antes.`
                : usd > 0 && usd < minimo
                  ? `El mínimo es ${dolares(minimo)}.`
                  : `El mínimo es ${dolares(minimo)}. Si ponen más, termina antes.`}
          </p>

          <p className="text-center text-[14px] text-tenue">Dólar al que lo compraron</p>
          <div className="py-3">
            {/* Cuando llega el blue se vuelve a montar con ese valor (si no lo cargaron a mano). */}
            <CampoMonto key={blue && dolarCargado === null ? "blue" : "a-mano"} valor={dolar} onCambio={setDolarCargado} onEnter={pagar} etiqueta="Dólar" chico lapiz />
          </div>
          <p className="mb-5 text-center text-[13px] leading-5 text-tenue">
            {blue ? `Blue venta hoy, ${pesos(blue.venta)}. Si lo compraron a otro precio, corregilo.` : "No pude traer el blue de hoy: cargá el precio al que lo compraron."}
          </p>

          <Boton onClick={pagar} disabled={!valido}>
            Pagar {pesos(enPesos, { ceroComoGuion: false })}
          </Boton>
        </section>
      )}
      {pago?.pagado && (
        <p className="mt-6 rounded-2xl bg-marca-suave px-4 py-3 text-center text-[15px] font-medium text-marca">
          Cuota de {nombre} pagada, {registro?.usd ? `${dolares(registro.usd)} a ${pesos(pago.monto / registro.usd)}: ` : ""}
          {pesos(pago.monto)}
        </p>
      )}

      <dl className="mt-5 divide-y divide-linea">
        <Dato etiqueta="Deben" valor={dolares(saldo)} />
        <Dato etiqueta={blue ? "Al blue de hoy, aprox." : "En pesos, aprox."} valor={pesos(saldo * dolarHoy, { ceroComoGuion: false })} />
        <Dato etiqueta="Pagaron" valor={`${dolares(dolaresPagados(datos, p))} de ${dolares(p.usdTotal ?? 0)}`} />
        <Dato etiqueta="Cuota mínima" valor={dolares(cuotaUsd)} />
        <Dato etiqueta="Vence el día" valor={p.dia} />
        <Dato etiqueta="Cuotas que faltan" valor={r.cuotas} />
        {ultima && saldo > 0 && <Dato etiqueta="Última cuota" valor={<span className="capitalize">{nombreMes(ultima)}</span>} />}
      </dl>
      <p className="mt-1 text-[13px] leading-5 text-tenue">Pagando el mínimo. Si un mes ponen más, termina antes.</p>

      {pagados.length > 0 && (
        <>
          <h3 className="mt-5 text-[16px] font-semibold">Pagos</h3>
          <dl className="divide-y divide-linea">
            {pagados.map((x) => (
              <Dato
                key={x.mes}
                etiqueta={<span className="capitalize">{nombreMes(x.mes)}</span>}
                valor={x.usd ? `${dolares(x.usd)}, ${pesos(x.monto)}` : pesos(x.monto)}
              />
            ))}
          </dl>
        </>
      )}

      {alEditar && (
        <div className="mt-5">
          <Boton variante="secundario" onClick={alEditar}>
            Editar datos
          </Boton>
        </div>
      )}
    </div>
  );
}

const NINGUNO = "";

/**
 * Préstamo nuevo o corregir uno. Lo que pide sale de la pantalla del banco: la cuota de este mes,
 * en qué cuota va, de cuántas, y el día. Si ya estaba cargado como pago fijo, lo reemplaza:
 * se convierte ese mismo pago (los meses pagados siguen como estaban).
 */
function FormularioPrestamo({ prestamo, alTerminar }: { prestamo?: PagoFijo; alTerminar: () => void }) {
  const { datos, mes, agregarPagoFijo, actualizarPagoFijo } = useBilletera();
  const deuda = datos.categorias.find((c) => c.nombre === "Deuda");
  const cuotaHoy = prestamo ? cuotaDelMes(prestamo, mes) : null;
  const [concepto, setConcepto] = useState(prestamo?.concepto ?? "");
  const [monto, setMonto] = useState(prestamo?.monto ?? 0);
  const [total, setTotal] = useState(prestamo?.cuotas ?? 36);
  const [numero, setNumero] = useState(cuotaHoy?.numero ?? 1);
  const [dia, setDia] = useState(prestamo?.dia ?? 10);
  const [uva, setUva] = useState(prestamo?.uva ?? false);
  // En dólares: lo que deben y la cuota mínima en USD, el dólar para estimar y la primera cuota.
  const [enDolares, setEnDolares] = useState(!!prestamo && esEnDolares(prestamo));
  const [usdTotal, setUsdTotal] = useState(prestamo?.usdTotal ?? 0);
  const [usdCuota, setUsdCuota] = useState(prestamo?.usdCuota ?? 0);
  const blue = useDolarBlue();
  const [dolarCargado, setDolarCargado] = useState<number | null>(prestamo && esEnDolares(prestamo) ? Math.round(dolarEstimado(prestamo)) : null);
  const dolar = dolarCargado ?? blue?.venta ?? 0;
  const siguiente = sumarMeses(mes, 1);
  const [primeraUsd, setPrimeraUsd] = useState<Mes>(prestamo?.altaDesde ?? siguiente);
  // Pagos fijos comunes que puede reemplazar (el de Galicia que en verdad era un préstamo).
  const reemplazables = prestamo ? [] : datos.pagosFijos.filter((p) => !p.cuotas && p.activo);
  const [reemplaza, setReemplaza] = useState(NINGUNO);

  const primera = sumarMeses(mes, -(numero - 1));
  const ultima = sumarMeses(primera, total - 1);
  // Las cuotas ya pagadas no se pueden sacar.
  const pagadas = prestamo ? datos.pagosMes.filter((p) => p.pagoFijoId === prestamo.id && p.pagado).map((p) => p.mes) : [];
  const minTotal = Math.max(numero, 1, ...pagadas.map((m) => mesesEntre(primera, m) + 1));
  const conDestino = !!deuda || !!prestamo || reemplaza !== NINGUNO;
  // En dólares, las cuotas salen de lo que deben y de lo ya pagado.
  const base: PagoFijo = prestamo ?? { id: "", concepto, categoriaId: "", dia, monto: 0, esDeuda: true, activo: true, prestamo: true };
  const cuotasUsd = usdTotal > 0 && usdCuota > 0 ? cuotasEnDolares(datos, { ...base, usdTotal, usdCuota, altaDesde: primeraUsd }) : 0;
  const ultimaUsd = sumarMeses(primeraUsd, Math.max(cuotasUsd, 1) - 1);
  const valido = enDolares
    ? concepto.trim() !== "" && usdTotal > 0 && usdCuota > 0 && usdCuota <= usdTotal && dolar > 0 && conDestino
    : concepto.trim() !== "" && monto > 0 && conDestino;

  const elegirReemplazo = (id: string) => {
    setReemplaza(id);
    const viejo = datos.pagosFijos.find((p) => p.id === id);
    if (!viejo) return;
    if (!concepto.trim()) setConcepto(viejo.concepto);
    if (!monto) setMonto(viejo.monto);
    setDia(viejo.dia);
  };

  const guardar = () => {
    if (!valido) return;
    const cambios: CambiosPagoFijo = enDolares
      ? {
          concepto: concepto.trim(),
          monto: Math.round(usdCuota * dolar),
          dia,
          cuotas: cuotasUsd,
          altaDesde: primeraUsd,
          prestamo: true,
          uva: false,
          tarjetaId: null,
          usdTotal,
          usdCuota,
        }
      : {
          concepto: concepto.trim(),
          monto,
          dia,
          cuotas: Math.max(total, minTotal),
          altaDesde: primera,
          prestamo: true,
          uva,
          tarjetaId: null,
          ...(prestamo && esEnDolares(prestamo) ? { usdTotal: null, usdCuota: null } : {}),
        };
    if (prestamo) actualizarPagoFijo(prestamo.id, cambios);
    // Reemplaza un pago fijo: se convierte ese mismo, con su categoría (así el pasado no cambia).
    else if (reemplaza !== NINGUNO) actualizarPagoFijo(reemplaza, { ...cambios, activo: true, bajaDesde: null });
    else if (deuda)
      agregarPagoFijo({
        concepto: cambios.concepto!,
        monto: cambios.monto!,
        dia,
        categoriaId: deuda.id,
        esDeuda: true,
        cuotas: cambios.cuotas,
        primeraCuota: cambios.altaDesde ?? primera,
        prestamo: true,
        uva: cambios.uva,
        ...(enDolares ? { usdTotal, usdCuota } : {}),
      });
    alTerminar();
  };

  const darDeBaja = () => {
    if (!prestamo) return;
    if (!confirm(`¿Dar de baja este préstamo desde ${nombreMes(mes)}? Deja de aparecer en Pagos. Los meses anteriores no cambian.`)) return;
    actualizarPagoFijo(prestamo.id, { activo: false, bajaDesde: mes });
    alTerminar();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      {reemplazables.length > 0 && (
        <label className="mb-3 flex min-h-14 items-center gap-3 rounded-2xl bg-relleno px-4">
          <span className="shrink-0 text-[15px] font-medium">Reemplaza a</span>
          <select
            value={reemplaza}
            onChange={(e) => elegirReemplazo(e.target.value)}
            className="min-w-0 flex-1 appearance-none truncate bg-transparent text-right text-[16px] font-medium outline-none"
          >
            <option value={NINGUNO}>Ningún pago fijo</option>
            {reemplazables.map((p) => (
              <option key={p.id} value={p.id}>
                {p.concepto}
              </option>
            ))}
          </select>
        </label>
      )}
      <CampoNombre etiqueta="Nombre" valor={concepto} onCambio={setConcepto} placeholder="Por ejemplo, Personal Galicia" autoFocus={!prestamo} />
      <label className="mt-3 flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-relleno px-4 py-3">
        <span>
          <span className="block text-[15px] font-medium">En dólares</span>
          <span className="block text-[13px] text-tenue">Se paga en pesos, al dólar del día</span>
        </span>
        <Interruptor activo={enDolares} onCambio={setEnDolares} />
      </label>
      {enDolares ? (
        <>
          <p className="mt-5 text-center text-[14px] text-tenue">Lo que deben hoy</p>
          <div className="py-4">
            <CampoMonto valor={usdTotal} onCambio={setUsdTotal} onEnter={guardar} moneda="US$" etiqueta="Lo que deben, en dólares" lapiz />
          </div>
          <p className="text-center text-[14px] text-tenue">Cuota mínima por mes</p>
          <div className="py-3">
            <CampoMonto valor={usdCuota} onCambio={setUsdCuota} onEnter={guardar} moneda="US$" etiqueta="Cuota mínima, en dólares" chico lapiz />
          </div>
          <p className="mt-2 text-center text-[14px] text-tenue">Dólar para estimar en pesos</p>
          <div className="py-3">
            {/* Cuando llega el blue se vuelve a montar con ese valor (si no lo cargaron a mano). */}
            <CampoMonto key={blue && dolarCargado === null ? "blue" : "a-mano"} valor={dolar} onCambio={setDolarCargado} onEnter={guardar} etiqueta="Dólar" chico lapiz />
          </div>
          <p className="mb-6 text-center text-[13px] leading-5 text-tenue">
            {blue ? `Blue venta hoy, ${pesos(blue.venta)}.` : "No pude traer el blue de hoy: cargalo a mano."} Al pagar cada cuota cargan el precio real.
          </p>

          <div className="mb-6 divide-y divide-linea rounded-2xl bg-relleno">
            <div className="px-4 py-3">
              <span className="text-[15px] font-medium">Primera cuota</span>
              {pagadas.length === 0 ? (
                <div className="mt-2 grid grid-cols-2 rounded-full bg-tarjeta p-1" role="radiogroup" aria-label="Primera cuota">
                  {[mes, siguiente].map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={primeraUsd === m}
                      onClick={() => setPrimeraUsd(m)}
                      className="h-10 rounded-full text-[14px] font-semibold capitalize text-tenue aria-checked:bg-marca aria-checked:text-sobre-marca"
                    >
                      {nombreMes(m)}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="ml-2 text-[15px] capitalize text-tenue">{nombreMes(primeraUsd)}</span>
              )}
              {cuotasUsd > 0 && (
                <span className="mt-2 block text-[13px] leading-5 text-tenue">
                  Pagando el mínimo son {cuotasUsd} cuotas, la última en {nombreMes(ultimaUsd)}
                  {dolar > 0 ? `, de unos ${pesos(usdCuota * dolar)}` : ""}. Si un mes ponen más, termina antes.
                </span>
              )}
            </div>
            <div className="flex min-h-14 items-center justify-between px-4 py-3">
              <span className="text-[15px] font-medium">Vence el día</span>
              <Contador valor={dia} min={1} max={31} onCambio={setDia} menos="Un día antes" mas="Un día después" />
            </div>
          </div>
        </>
      ) : (
        <>
        <p className="mt-4 text-[14px] leading-5 text-tenue">La cuota de {nombreMes(mes).split(" ")[0]}, como figura en el banco.</p>
        <div className="py-7">
          {/* Al elegir qué reemplaza, el monto se completa: se vuelve a montar con ese valor. */}
          <CampoMonto key={reemplaza} valor={monto} onCambio={setMonto} onEnter={guardar} lapiz />
        </div>

        <div className="mb-6 divide-y divide-linea rounded-2xl bg-relleno">
          <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
            <span className="text-[15px] font-medium">Cuota de este mes</span>
            <Contador valor={numero} min={1} max={total} onCambio={setNumero} menos="Una cuota menos" mas="Una cuota más" />
          </div>
          <div className="px-4 py-3">
            <div className="flex min-h-10 items-center justify-between gap-3">
              <span className="text-[15px] font-medium">Cuotas en total</span>
              <Contador valor={total} min={minTotal} max={120} onCambio={setTotal} menos="Una cuota menos" mas="Una cuota más" />
            </div>
            <span className="mt-1 block text-[13px] text-tenue">
              En {nombreMes(mes)} va la {numero} de {total}. La última, en {nombreMes(ultima)}.
            </span>
          </div>
          <div className="flex min-h-14 items-center justify-between px-4 py-3">
            <span className="text-[15px] font-medium">Vence el día</span>
            <Contador valor={dia} min={1} max={31} onCambio={setDia} menos="Un día antes" mas="Un día después" />
          </div>
          <button type="button" role="switch" aria-checked={uva} onClick={() => setUva(!uva)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left">
            <span>
              <span className="block text-[15px] font-medium">Se ajusta por UVA</span>
              <span className="block text-[13px] text-tenue">La cuota en pesos sube cada mes</span>
            </span>
            <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${uva ? "bg-marca" : "bg-linea"}`}>
              <span className={`absolute top-0.5 size-6 rounded-full bg-tarjeta shadow transition-transform ${uva ? "translate-x-[22px]" : "translate-x-0.5"}`} />
            </span>
          </button>
        </div>
        </>
      )}

      <Boton type="submit" disabled={!valido}>
        {prestamo ? "Guardar" : "Agregar"}
      </Boton>
      {prestamo && prestamo.activo && pagoFijoVigente(prestamo, mes) && (
        <div className="mt-3">
          <Boton type="button" variante="peligro" onClick={darDeBaja}>
            Dar de baja
          </Boton>
          <p className="mt-2 text-center text-[13px] text-tenue">Por ejemplo, si lo cancelaste antes. Cuando termina, se va solo.</p>
        </div>
      )}
    </form>
  );
}
