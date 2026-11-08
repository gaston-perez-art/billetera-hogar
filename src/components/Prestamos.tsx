"use client";

// Préstamos (pestaña dentro de Pagos). Un préstamo es un pago fijo en cuotas sin tarjeta:
// aparece en Fijos con "Cuota 5 de 36" y se deja de mostrar solo después de la última.
// Los que se ajustan por UVA cambian de monto cada mes: con la TNA y los TyC no se llega
// al monto exacto (el banco suma IVA sobre el interés y otros cargos), así que la cuota de
// cada mes se copia del banco al pagar. La app usa la última como estimado de las que vienen.
// Nunca se guarda el número de préstamo ni el de la cuenta.

import { useState } from "react";
import { IconoCategoria } from "@/components/Iconos";
import { Boton, CampoMonto, CampoNombre, Cifras, Contador, Dato, FilaLista, Grupo, Hoja, Resumen } from "@/components/ui";
import { cuotaDelMes, mesesEntre, mesUltimaCuota, pagoFijoVigente, pagosDelMes, restaDeCompra, textoCuota } from "@/lib/calculos";
import { nombreMes, pesos, sumarMeses } from "@/lib/formato";
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
  const hayUva = vigentes.some((p) => p.uva);
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
          : (textoCuota(p, mes) ?? "");
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
        Las cuotas se pagan desde acá o desde Fijos. Si se ajusta por UVA, la cuota sube cada mes: copiá la que te muestra el banco al pagar.
      </p>

      <main className="mt-5 space-y-5">
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
function DetallePrestamo({ prestamo: p, alEditar, alCerrar }: { prestamo: PagoFijo; alEditar: () => void; alCerrar: () => void }) {
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

      <div className="mt-5">
        <Boton variante="secundario" onClick={alEditar}>
          Editar datos
        </Boton>
      </div>
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
  // Pagos fijos comunes que puede reemplazar (el de Galicia que en verdad era un préstamo).
  const reemplazables = prestamo ? [] : datos.pagosFijos.filter((p) => !p.cuotas && p.activo);
  const [reemplaza, setReemplaza] = useState(NINGUNO);

  const primera = sumarMeses(mes, -(numero - 1));
  const ultima = sumarMeses(primera, total - 1);
  // Las cuotas ya pagadas no se pueden sacar.
  const pagadas = prestamo ? datos.pagosMes.filter((p) => p.pagoFijoId === prestamo.id && p.pagado).map((p) => p.mes) : [];
  const minTotal = Math.max(numero, 1, ...pagadas.map((m) => mesesEntre(primera, m) + 1));
  const valido = concepto.trim() !== "" && monto > 0 && (!!deuda || !!prestamo || reemplaza !== NINGUNO);

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
    const cambios: CambiosPagoFijo = {
      concepto: concepto.trim(),
      monto,
      dia,
      cuotas: Math.max(total, minTotal),
      altaDesde: primera,
      prestamo: true,
      uva,
      tarjetaId: null,
    };
    if (prestamo) actualizarPagoFijo(prestamo.id, cambios);
    // Reemplaza un pago fijo: se convierte ese mismo, con su categoría (así el pasado no cambia).
    else if (reemplaza !== NINGUNO) actualizarPagoFijo(reemplaza, { ...cambios, activo: true, bajaDesde: null });
    else if (deuda) agregarPagoFijo({ concepto: concepto.trim(), monto, dia, categoriaId: deuda.id, esDeuda: true, cuotas: cambios.cuotas, primeraCuota: primera, prestamo: true, uva });
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
