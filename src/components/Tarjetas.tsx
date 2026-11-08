"use client";

// Tarjetas (pestaña dentro de Pagos): compras en cuotas agrupadas por tarjeta.
// Cada cuota también aparece en Fijos para pagarla; acá se cargan, se editan y se ve
// cuánto va en cada tarjeta. Una tarjeta es solo banco, últimos 4 números y de quién es.

import { useState } from "react";
import { Icono, ICONOS } from "@/components/Iconos";
import { Boton, CampoMonto, CampoNombre, Cifras, Contador, FilaLista, Grupo, Hoja, Resumen } from "@/components/ui";
import { cuotaDelMes, mesesEntre, mesUltimaCuota, pagoFijoVigente, textoCuota } from "@/lib/calculos";
import { mesCorto, nombreMes, pesos, sumarMeses } from "@/lib/formato";
import type { NuevaTarjeta, NuevoPagoFijo } from "@/lib/operaciones";
import { useBilletera } from "@/lib/store";
import type { Mes, PagoFijo, Tarjeta } from "@/lib/tipos";

export function nombreTarjeta(t: Pick<Tarjeta, "banco" | "ultimos4">) {
  return `${t.banco} ${t.ultimos4}`;
}

type Edicion = { tipo: "compra"; id: string } | { tipo: "nuevaCompra" } | { tipo: "tarjeta"; id: string } | { tipo: "nuevaTarjeta" };

const SIN_TARJETA = "";

/** Cómo va una compra en el mes elegido. 0 = tiene cuota, 1 = empieza más adelante, 2 = terminada o de baja. */
function estadoCompra(p: PagoFijo, mes: Mes) {
  return pagoFijoVigente(p, mes) ? 0 : p.activo && p.altaDesde && p.altaDesde > mes ? 1 : 2;
}

function bajadaCompra(p: PagoFijo, mes: Mes): string {
  const ultima = mesUltimaCuota(p);
  if (!p.activo && (!p.bajaDesde || p.bajaDesde <= mes)) return "Dada de baja";
  const cuota = textoCuota(p, mes);
  if (cuota && pagoFijoVigente(p, mes)) return `${cuota}, vence el ${p.dia}`;
  if (p.altaDesde && p.altaDesde > mes) return `${p.cuotas} cuotas desde ${nombreMes(p.altaDesde)}`;
  return ultima ? `Terminó en ${nombreMes(ultima)}` : "Terminada";
}

export function VistaTarjetas() {
  const { datos, mes } = useBilletera();
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const tarjetas = datos.tarjetas ?? [];
  const compras = datos.pagosFijos.filter((p) => p.cuotas);
  const delMes = compras.filter((p) => estadoCompra(p, mes) === 0);
  const proximas = compras.filter((p) => estadoCompra(p, mes) === 1);
  const terminadas = compras.filter((p) => estadoCompra(p, mes) === 2);
  const total = delMes.reduce((a, p) => a + p.monto, 0);
  const nombre = (id: string) => datos.miembros.find((m) => m.id === id)?.nombre ?? "";
  const deTarjeta = (id: string | null | undefined) => tarjetas.find((t) => t.id === id);

  // Lo del mes, por tarjeta (y "Sin tarjeta" al final si hay).
  const grupos = [...tarjetas.map((t) => ({ clave: t.id, titulo: nombreTarjeta(t), tarjeta: t as Tarjeta | undefined })), { clave: SIN_TARJETA, titulo: "Sin tarjeta", tarjeta: undefined }]
    .map((g) => ({ ...g, compras: delMes.filter((p) => (deTarjeta(p.tarjetaId)?.id ?? SIN_TARJETA) === g.clave).sort((a, b) => a.dia - b.dia) }))
    .filter((g) => g.compras.length > 0);

  // Cuánto va en tarjetas de cada uno (la cuota es de la casa; esto dice de qué resumen sale).
  const porPersona = datos.miembros
    .map((m) => ({ etiqueta: `De ${m.nombre}`, valor: delMes.filter((p) => deTarjeta(p.tarjetaId)?.miembroId === m.id).reduce((a, p) => a + p.monto, 0) }))
    .filter((x) => x.valor > 0);
  const termina = delMes
    .map((p) => ({ p, ultima: mesUltimaCuota(p) }))
    .filter((x) => x.ultima === mes)
    .map((x) => x.p.concepto);

  const fila = (p: PagoFijo) => {
    const t = deTarjeta(p.tarjetaId);
    return (
      <FilaLista
        key={p.id}
        titulo={p.concepto}
        bajada={bajadaCompra(p, mes) + (estadoCompra(p, mes) !== 0 && t ? `, ${nombreTarjeta(t)}` : "")}
        valor={pesos(p.monto)}
        apagada={estadoCompra(p, mes) === 2}
        onClick={() => setEdicion({ tipo: "compra", id: p.id })}
      />
    );
  };

  return (
    <>
      <Resumen etiqueta={`En cuotas en ${nombreMes(mes).split(" ")[0]}`} monto={total}>
        {porPersona.length > 0 && <Cifras items={porPersona.map((x) => ({ etiqueta: x.etiqueta, valor: pesos(x.valor, { ceroComoGuion: false }) }))} />}
        <p className={`text-[13px] leading-5 text-tenue ${porPersona.length > 0 ? "mt-3" : ""}`}>
          {delMes.length === 0
            ? "No hay cuotas este mes."
            : termina.length > 0
              ? `${delMes.length} ${delMes.length === 1 ? "compra" : "compras"}. ${termina.length === 1 ? `${termina[0]} termina` : `${termina.join(" y ")} terminan`} este mes.`
              : `${delMes.length} ${delMes.length === 1 ? "compra" : "compras"}. Se pagan desde Fijos, junto con el resto.`}
        </p>
      </Resumen>

      <div className="mx-5 mt-4">
        <Boton onClick={() => setEdicion({ tipo: "nuevaCompra" })}>
          <Icono trazo={ICONOS.mas} className="size-5" />
          Agregar compra en cuotas
        </Boton>
      </div>

      <main className="mt-5 space-y-5">
        {grupos.map((g) => (
          <Grupo key={g.clave || "sin"} titulo={g.titulo} detalle={pesos(g.compras.reduce((a, p) => a + p.monto, 0))}>
            {g.compras.map(fila)}
          </Grupo>
        ))}
        {proximas.length > 0 && <Grupo titulo="Empiezan más adelante">{proximas.map(fila)}</Grupo>}
        {terminadas.length > 0 && <Grupo titulo="Terminadas">{terminadas.map(fila)}</Grupo>}

        <Grupo titulo="Tus tarjetas">
          {tarjetas.map((t) => {
            const cuantas = compras.filter((p) => p.tarjetaId === t.id && estadoCompra(p, mes) < 2).length;
            return (
              <FilaLista
                key={t.id}
                icono={<IconoTarjeta />}
                titulo={nombreTarjeta(t)}
                bajada={`De ${nombre(t.miembroId)}${cuantas > 0 ? `, ${cuantas} ${cuantas === 1 ? "compra" : "compras"} en curso` : ""}`}
                valor={<Icono trazo={ICONOS.lapiz} className="size-4 text-sutil" />}
                onClick={() => setEdicion({ tipo: "tarjeta", id: t.id })}
              />
            );
          })}
          <button onClick={() => setEdicion({ tipo: "nuevaTarjeta" })} className="fila flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-linea text-marca">
              <Icono trazo={ICONOS.mas} className="size-4" />
            </span>
            <span className="text-[15px] font-medium text-marca">Agregar tarjeta</span>
          </button>
        </Grupo>
        <p className="mx-6 text-[13px] leading-5 text-tenue">Solo banco y últimos 4 números, para reconocerla. Nunca el número completo.</p>
      </main>

      <HojaTarjetas edicion={edicion} alCerrar={() => setEdicion(null)} />
    </>
  );
}

function IconoTarjeta() {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-linea text-texto">
      <Icono trazo={ICONOS.tarjeta} className="size-5" />
    </span>
  );
}

function HojaTarjetas({ edicion, alCerrar }: { edicion: Edicion | null; alCerrar: () => void }) {
  const { datos, mes, actualizarPagoFijo, agregarPagoFijo, agregarTarjeta, actualizarTarjeta, borrarTarjeta } = useBilletera();
  const compra = edicion?.tipo === "compra" ? datos.pagosFijos.find((p) => p.id === edicion.id) : undefined;
  const tarjeta = edicion?.tipo === "tarjeta" ? datos.tarjetas?.find((t) => t.id === edicion.id) : undefined;
  const titulo =
    edicion?.tipo === "nuevaCompra"
      ? "Nueva compra en cuotas"
      : edicion?.tipo === "compra"
        ? "Editar compra en cuotas"
        : edicion?.tipo === "nuevaTarjeta"
          ? "Nueva tarjeta"
          : "Editar tarjeta";

  return (
    <Hoja abierta={edicion !== null} alCerrar={alCerrar} titulo={titulo} mostrarTitulo>
      {(edicion?.tipo === "nuevaCompra" || compra) && (
        <FormularioCompra
          key={compra ? `compra-${compra.id}` : "nueva"}
          compra={compra}
          alGuardar={(nueva, tarjetaNueva) => {
            const tarjetaId = tarjetaNueva ? agregarTarjeta(tarjetaNueva) : nueva.tarjetaId ?? null;
            if (compra) {
              actualizarPagoFijo(compra.id, {
                concepto: nueva.concepto,
                monto: nueva.monto,
                dia: nueva.dia,
                cuotas: nueva.cuotas,
                altaDesde: nueva.primeraCuota,
                tarjetaId,
              });
            } else {
              agregarPagoFijo({ ...nueva, tarjetaId });
            }
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
      {(edicion?.tipo === "nuevaTarjeta" || tarjeta) && (
        <FormularioTarjeta
          key={tarjeta ? `tarjeta-${tarjeta.id}` : "nueva-tarjeta"}
          tarjeta={tarjeta}
          alGuardar={(t) => {
            if (tarjeta) actualizarTarjeta(tarjeta.id, t);
            else agregarTarjeta(t);
            alCerrar();
          }}
          alBorrar={
            tarjeta
              ? () => {
                  borrarTarjeta(tarjeta.id);
                  alCerrar();
                }
              : undefined
          }
        />
      )}
    </Hoja>
  );
}

/** Banco, últimos 4 y de quién es. Se usa sola o dentro de una compra (tarjeta nueva al toque). */
function CamposTarjeta({ valor, onCambio }: { valor: NuevaTarjeta; onCambio: (t: NuevaTarjeta) => void }) {
  const { datos } = useBilletera();
  return (
    <div className="divide-y divide-linea rounded-2xl bg-relleno">
      <label className="flex min-h-14 items-center gap-3 px-4">
        <span className="shrink-0 text-[15px] font-medium">Banco</span>
        <input
          value={valor.banco}
          onChange={(e) => onCambio({ ...valor, banco: e.target.value })}
          placeholder="Por ejemplo, Galicia"
          className="min-w-0 flex-1 bg-transparent text-right text-[16px] font-medium outline-none placeholder:text-sutil"
        />
      </label>
      <label className="flex min-h-14 items-center gap-3 px-4">
        <span className="shrink-0 text-[15px] font-medium">Últimos 4 números</span>
        <input
          value={valor.ultimos4}
          onChange={(e) => onCambio({ ...valor, ultimos4: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          inputMode="numeric"
          placeholder="1234"
          className="min-w-0 flex-1 bg-transparent text-right text-[16px] font-medium tabular-nums outline-none placeholder:text-sutil"
        />
      </label>
      <div className="px-4 py-3">
        <span className="block text-[15px] font-medium">De quién es</span>
        <div className="mt-2 grid grid-cols-2 rounded-full bg-tarjeta p-1" role="radiogroup" aria-label="De quién es">
          {datos.miembros.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={valor.miembroId === m.id}
              onClick={() => onCambio({ ...valor, miembroId: m.id })}
              className="h-10 rounded-full text-[14px] font-semibold text-tenue aria-checked:bg-marca aria-checked:text-sobre-marca"
            >
              {m.nombre}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const tarjetaValida = (t: NuevaTarjeta) => t.banco.trim() !== "" && /^\d{4}$/.test(t.ultimos4) && t.miembroId !== "";

function FormularioTarjeta({ tarjeta, alGuardar, alBorrar }: { tarjeta?: Tarjeta; alGuardar: (t: NuevaTarjeta) => void; alBorrar?: () => void }) {
  const { usuarioId, datos } = useBilletera();
  const [valor, setValor] = useState<NuevaTarjeta>({
    banco: tarjeta?.banco ?? "",
    ultimos4: tarjeta?.ultimos4 ?? "",
    miembroId: tarjeta?.miembroId ?? usuarioId,
  });
  const compras = tarjeta ? datos.pagosFijos.filter((p) => p.tarjetaId === tarjeta.id).length : 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (tarjetaValida(valor)) alGuardar(valor);
      }}
    >
      <CamposTarjeta valor={valor} onCambio={setValor} />
      <div className="mt-6">
        <Boton type="submit" disabled={!tarjetaValida(valor)}>
          {tarjeta ? "Guardar" : "Agregar"}
        </Boton>
      </div>
      {tarjeta && alBorrar && (
        <div className="mt-3">
          <Boton
            type="button"
            variante="peligro"
            onClick={() =>
              confirm(
                compras > 0
                  ? `¿Borrar ${nombreTarjeta(tarjeta)}? Sus ${compras} ${compras === 1 ? "compra queda" : "compras quedan"} sin tarjeta, no se borran.`
                  : `¿Borrar ${nombreTarjeta(tarjeta)}?`,
              ) && alBorrar()
            }
          >
            Borrar tarjeta
          </Boton>
        </div>
      )}
    </form>
  );
}

const NUEVA = "__nueva__";

/**
 * Compra en cuotas. Nueva: qué es, valor total, cuántas cuotas, día, en qué mes cae la primera
 * (por defecto el siguiente, como llega en el resumen) y con qué tarjeta. Va siempre a Deuda.
 * Ya cargada: se puede corregir todo; acá el monto es el de cada cuota. Las cuotas ya pagadas
 * no cambian (guardan su monto y siguen apareciendo en su mes).
 */
function FormularioCompra({
  compra,
  alGuardar,
  alDarDeBaja,
}: {
  compra?: PagoFijo;
  alGuardar: (pago: NuevoPagoFijo & { primeraCuota: Mes }, tarjetaNueva?: NuevaTarjeta) => void;
  alDarDeBaja?: () => void;
}) {
  const { datos, mes, usuarioId } = useBilletera();
  const deuda = datos.categorias.find((c) => c.nombre === "Deuda");
  const tarjetas = datos.tarjetas ?? [];
  const siguiente = sumarMeses(mes, 1);
  const [concepto, setConcepto] = useState(compra?.concepto ?? "");
  // Nueva: el valor total. Ya cargada: el valor de cada cuota.
  const [monto, setMonto] = useState(compra?.monto ?? 0);
  const [cuotas, setCuotas] = useState(compra?.cuotas ?? 6);
  const [dia, setDia] = useState(compra?.dia ?? 10);
  const [primera, setPrimera] = useState<Mes>(compra?.altaDesde ?? siguiente);
  const [tarjetaId, setTarjetaId] = useState<string>(compra ? (compra.tarjetaId ?? SIN_TARJETA) : (tarjetas.find((t) => t.miembroId === usuarioId)?.id ?? tarjetas[0]?.id ?? NUEVA));
  const [nueva, setNueva] = useState<NuevaTarjeta>({ banco: "", ultimos4: "", miembroId: usuarioId });

  const porCuota = compra ? monto : Math.round((monto / cuotas) * 100) / 100;
  const conTarjetaNueva = tarjetaId === NUEVA;
  const valido = concepto.trim() !== "" && monto > 0 && !!deuda && (!conTarjetaNueva || tarjetaValida(nueva));
  const ultima = sumarMeses(primera, cuotas - 1);
  const cuotaHoy = compra ? cuotaDelMes({ ...compra, cuotas, altaDesde: primera }, mes) : null;
  // Las cuotas que ya se pagaron no se pueden sacar: como mínimo, hasta la última pagada.
  const pagadas = compra ? datos.pagosMes.filter((p) => p.pagoFijoId === compra.id && p.pagado).map((p) => p.mes) : [];
  const minCuotas = Math.max(1, ...pagadas.map((m) => mesesEntre(primera, m) + 1));
  const desplazamiento = mesesEntre(mes, primera);

  const guardar = () => {
    if (!valido || !deuda) return;
    alGuardar(
      {
        concepto: concepto.trim(),
        monto: porCuota,
        dia,
        categoriaId: deuda.id,
        esDeuda: true,
        cuotas: Math.max(cuotas, minCuotas),
        primeraCuota: primera,
        tarjetaId: conTarjetaNueva || tarjetaId === SIN_TARJETA ? null : tarjetaId,
      },
      conTarjetaNueva ? nueva : undefined,
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <CampoNombre etiqueta="Qué compraste" valor={concepto} onCambio={setConcepto} placeholder="Por ejemplo, Heladera" autoFocus={!compra} />
      <p className="mt-4 text-[14px] leading-5 text-tenue">
        {compra ? "El valor de cada cuota. Las ya pagadas no cambian." : "El valor total de la compra. Se divide en las cuotas."}
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
        <div className="flex min-h-14 items-center justify-between px-4 py-3">
          <span className="text-[15px] font-medium">Cuotas</span>
          <Contador valor={cuotas} min={minCuotas} max={120} onCambio={setCuotas} menos="Una cuota menos" mas="Una cuota más" />
        </div>
        <div className="px-4 py-3">
          <div className="flex min-h-10 items-center justify-between gap-3">
            <span className="text-[15px] font-medium">Primera cuota</span>
            {compra ? (
              <Contador
                valor={desplazamiento}
                min={-36}
                max={12}
                onCambio={(n) => setPrimera(sumarMeses(mes, n))}
                menos="Un mes antes"
                mas="Un mes después"
                texto={`${mesCorto(primera)} ${primera.slice(0, 4)}`}
              />
            ) : null}
          </div>
          {!compra && (
            <div className="mt-2 grid grid-cols-2 rounded-full bg-tarjeta p-1" role="radiogroup" aria-label="Primera cuota">
              {[mes, siguiente].map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={primera === m}
                  onClick={() => setPrimera(m)}
                  className="h-10 rounded-full text-[14px] font-semibold capitalize text-tenue aria-checked:bg-marca aria-checked:text-sobre-marca"
                >
                  {nombreMes(m)}
                </button>
              ))}
            </div>
          )}
          <span className="mt-2 block text-[13px] text-tenue">
            {cuotaHoy && cuotaHoy.numero >= 1 && cuotaHoy.numero <= cuotaHoy.total ? `En ${nombreMes(mes)} va la ${cuotaHoy.numero} de ${cuotaHoy.total}. ` : ""}
            La última, en {nombreMes(ultima)}.
          </span>
        </div>
        <div className="flex min-h-14 items-center justify-between px-4 py-3">
          <span>
            <span className="block text-[15px] font-medium">Vence el día</span>
            <span className="block text-[13px] text-tenue">Del resumen de la tarjeta</span>
          </span>
          <Contador valor={dia} min={1} max={31} onCambio={setDia} menos="Un día antes" mas="Un día después" />
        </div>
        <label className="flex min-h-14 items-center gap-3 px-4">
          <span className="shrink-0 text-[15px] font-medium">Tarjeta</span>
          <select
            value={tarjetaId}
            onChange={(e) => setTarjetaId(e.target.value)}
            className="min-w-0 flex-1 appearance-none bg-transparent text-right text-[16px] font-medium outline-none"
          >
            {tarjetas.map((t) => (
              <option key={t.id} value={t.id}>
                {nombreTarjeta(t)}, de {datos.miembros.find((m) => m.id === t.miembroId)?.nombre}
              </option>
            ))}
            <option value={NUEVA}>Nueva tarjeta</option>
            <option value={SIN_TARJETA}>Sin tarjeta</option>
          </select>
          <Icono trazo={ICONOS.lapiz} className="size-4 shrink-0 text-sutil" />
        </label>
        <div className="flex min-h-14 items-center justify-between gap-3 px-4">
          <span>
            <span className="block text-[15px] font-medium">Categoría</span>
            <span className="block text-[13px] text-tenue">Se suma sola al techo de Deuda</span>
          </span>
          <span className="text-[15px] text-tenue">{deuda?.nombre ?? "Falta la categoría Deuda"}</span>
        </div>
      </div>

      {conTarjetaNueva && (
        <div className="mb-6">
          <p className="mb-2 px-1 text-[13px] text-tenue">Tarjeta nueva</p>
          <CamposTarjeta valor={nueva} onCambio={setNueva} />
        </div>
      )}

      <Boton type="submit" disabled={!valido}>
        {compra ? "Guardar" : "Agregar"}
      </Boton>

      {compra && alDarDeBaja && compra.activo && pagoFijoVigente(compra, mes) && (
        <div className="mt-3">
          <Boton
            type="button"
            variante="peligro"
            onClick={() => confirm(`¿Dar de baja esta compra desde ${nombreMes(mes)}? Deja de aparecer en Pagos. Los meses anteriores no cambian.`) && alDarDeBaja()}
          >
            Dar de baja
          </Boton>
          <p className="mt-2 text-center text-[13px] text-tenue">Por ejemplo, si la cancelaste antes. Cuando termina, se va sola.</p>
        </div>
      )}
    </form>
  );
}
