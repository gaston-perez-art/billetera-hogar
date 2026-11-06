"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Icono, IconoCategoria, ICONOS } from "@/components/Iconos";
import { Avatar, Cifras, Encabezado, MontoGrande, MontoQueda } from "@/components/ui";
import { estadisticasPersona, ingresosDelMes, previstoPorTipo, repartoMes, type EstadisticasPersona, type RepartoMiembro } from "@/lib/calculos";
import { fechaCorta, nombreMes, pesos, sumarMeses } from "@/lib/formato";
import { datoCurioso, FUENTE_URL } from "@/lib/indec";
import { prepararFoto, useFotos } from "@/lib/fotos";
import { useBilletera } from "@/lib/store";

const CAMARA = ["M4 8h3l2-3h6l2 3h3v11H4z", "M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"];

export default function Reparto() {
  const { datos, mes } = useBilletera();
  const { previsto, miembros } = repartoMes(datos, mes);
  const { fijos, variables } = previstoPorTipo(datos, mes);
  const entra = ingresosDelMes(datos, mes);
  const [a, b] = miembros;

  return (
    <>
      <Encabezado titulo="Reparto" />
      <TarjetaQueGira
        frente={
          <>
            <MontoGrande monto={previsto} className="text-[40px]" />
            <p className="mt-2 text-[14px] text-tenue">Gastos del mes, entre los dos</p>
            <div className="mt-5 border-t border-linea pt-4">
              {a && b && (
                <div className="mb-5 flex items-center gap-3">
                  <Avatar id={a.miembroId} nombre={a.nombre} tamano={36} />
                  <div className="flex-1">
                    <div className="flex h-2 gap-1">
                      <span className="rounded-full bg-marca" style={{ width: `${a.proporcion * 100}%` }} />
                      <span className="rounded-full bg-marca/35" style={{ width: `${b.proporcion * 100}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[13px] font-semibold">
                      <span>{Math.round(a.proporcion * 100)}%</span>
                      <span className="text-tenue">{Math.round(b.proporcion * 100)}%</span>
                    </div>
                  </div>
                  <Avatar id={b.miembroId} nombre={b.nombre} tamano={36} />
                </div>
              )}
              <Cifras
                items={[
                  { etiqueta: "Fijos", valor: pesos(fijos) },
                  { etiqueta: "Variables", valor: pesos(variables) },
                ]}
              />
            </div>
          </>
        }
        dorso={<Ingresos entra={entra} miembros={miembros} />}
      />

      <p className="mx-5 mt-7 text-[13px] leading-5 text-tenue">Cada uno pone para la casa según lo que gana. Lo que sobra después de poner su parte es de cada uno.</p>

      <main className="mt-5 space-y-4 px-5">
        {miembros.map((m) => (
          <TarjetaPersona
            key={m.miembroId}
            m={m}
            fijos={fijos * m.proporcion}
            variables={variables * m.proporcion}
            estadisticas={estadisticasPersona(datos, mes, m.miembroId, sumarMeses(mes, -1))}
            mesAnterior={nombreMes(sumarMeses(mes, -1)).split(" ")[0].toLowerCase()}
          />
        ))}
      </main>
    </>
  );
}

/**
 * Tarjeta de cada uno. Al tocarla muestra en qué gasta, en el mismo lugar y sin cambiar
 * de alto: las estadísticas tapan la cara del reparto, que sigue marcando el tamaño.
 */
function TarjetaPersona({
  m,
  fijos,
  variables,
  estadisticas,
  mesAnterior,
}: {
  m: RepartoMiembro;
  fijos: number;
  variables: number;
  estadisticas: EstadisticasPersona;
  mesAnterior: string;
}) {
  const [stats, setStats] = useState(false);
  const alternar = () => setStats((v) => !v);
  const avance = m.leToca > 0 ? Math.min(m.puso / m.leToca, 1) : 0;
  const d = Math.round(m.diferencia);
  const sobrante = Math.round(m.leQuedaPlan);

  return (
    <section
      role="button"
      tabIndex={0}
      aria-pressed={stats}
      aria-label={stats ? `En qué gasta ${m.nombre}. Tocá para volver al reparto` : `Reparto de ${m.nombre}. Tocá para ver en qué gasta`}
      onClick={alternar}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          alternar();
        }
      }}
      className="relative cursor-pointer select-none overflow-hidden rounded-3xl bg-tarjeta shadow-tarjeta ring-1 ring-linea"
    >
      <div
        className={`p-5 transition-opacity duration-200 motion-reduce:transition-none ${stats ? "invisible opacity-0" : "opacity-100"}`}
        aria-hidden={stats}
      >
      <div className="flex items-center gap-3">
        <FotoEditable id={m.miembroId} nombre={m.nombre} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-bold leading-tight">{m.nombre}</h2>
          <p className="mt-0.5 text-[13px] text-tenue tabular-nums">
            Gana {pesos(m.ingresa)}, pone el {Math.round(m.proporcion * 100)}%
          </p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-relleno text-texto" aria-hidden>
          <Icono trazo={ICONOS.categorias} className="size-[18px]" />
        </span>
      </div>

      <dl className="mt-5 space-y-2.5 text-[15px] tabular-nums">
        <Renglon etiqueta="Le toca poner" valor={pesos(m.leToca)} fuerte />
        <Renglon etiqueta="Fijos" valor={pesos(fijos)} sangria />
        <Renglon etiqueta="Variables" valor={pesos(variables)} sangria />
      </dl>

      <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-linea pt-4 text-[15px]">
        <span>
          <span className="block text-tenue">Lleva puesto</span>
          <span className="mt-0.5 block text-[13px] text-tenue">{Math.round(avance * 100)}% de lo que le toca</span>
        </span>
        <span className="font-semibold tabular-nums">{pesos(m.puso, { ceroComoGuion: false })}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-marca-suave p-3.5">
          <p className="text-[13px] text-tenue">{sobrante >= 0 ? `Queda para ${m.nombre}` : "No le alcanza"}</p>
          <p className={`mt-1 text-[18px] font-bold tabular-nums ${sobrante >= 0 ? "text-marca" : "text-pasaste"}`}>{pesos(Math.abs(m.leQuedaPlan), { ceroComoGuion: false })}</p>
          <p className="mt-0.5 text-[12px] leading-4 text-tenue">{sobrante >= 0 ? "Lo que gana menos su parte de la casa" : "Su parte de la casa supera lo que gana"}</p>
        </div>
        <div className="rounded-2xl bg-relleno p-3.5">
          <p className="text-[13px] text-tenue">Le queda hoy</p>
          <p className={`mt-1 text-[18px] font-bold tabular-nums ${Math.round(m.leQuedaReal) < 0 ? "text-pasaste" : ""}`}>{pesos(m.leQuedaReal, { ceroComoGuion: false })}</p>
          <p className="mt-0.5 text-[12px] leading-4 text-tenue">Lo que le entró menos lo que ya puso</p>
        </div>
      </div>

      <div className="mt-4 border-t border-linea pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold">{d > 0 ? "Le falta poner" : d < 0 ? "Puso de más" : "Está al día"}</span>
          <MontoQueda monto={m.diferencia} className="text-[17px] font-bold" />
        </div>
        {d < 0 && (
          <p className="mt-1 text-[13px] leading-5 text-tenue">
            Puso {pesos(-m.diferencia)} más que su parte: eso sale de lo que le queda para {m.nombre}. Al cerrar el mes, se compensa entre los dos.
          </p>
        )}
      </div>
      </div>

      <EnQueGasta
        visible={stats}
        nombre={m.nombre}
        id={m.miembroId}
        e={estadisticas}
        mesAnterior={mesAnterior}
      />
    </section>
  );
}

/** La otra cara de la tarjeta de cada uno: en qué gasta este mes, con palabras y sin barras. */
function EnQueGasta({
  visible,
  nombre,
  id,
  e,
  mesAnterior,
}: {
  visible: boolean;
  nombre: string;
  id: string;
  e: EstadisticasPersona;
  mesAnterior: string;
}) {
  const cambio = e.totalAnterior > 0 ? Math.round(((e.total - e.totalAnterior) / e.totalAnterior) * 100) : null;
  const comparacion =
    cambio === null
      ? null
      : cambio === 0
        ? `Igual que en ${mesAnterior}`
        : `${Math.abs(cambio)}% ${cambio > 0 ? "más" : "menos"} que en ${mesAnterior}`;
  return (
    <div
      aria-hidden={!visible}
      className={`absolute inset-0 flex flex-col p-5 transition-opacity duration-200 motion-reduce:transition-none ${visible ? "opacity-100" : "invisible opacity-0"}`}
    >
      <div className="flex items-center gap-3">
        <Avatar id={id} nombre={nombre} tamano={40} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-bold leading-tight">En qué gasta {nombre}</h2>
          <p className="mt-0.5 text-[13px] text-tenue">Este mes, sin contar pagos fijos</p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-relleno text-texto" aria-hidden>
          <Icono trazo={ICONOS.cerrar} className="size-[18px]" />
        </span>
      </div>

      {e.cantidad === 0 ? (
        <p className="m-auto px-4 text-center text-[15px] text-tenue">Todavía no cargó gastos este mes{e.fijos > 0 ? `, solo pagos fijos por ${pesos(e.fijos)}` : ""}.</p>
      ) : (
        <>
          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-linea pt-4">
            <span>
              <span className="block text-[15px] text-tenue">
                Gastó en {e.cantidad === 1 ? "1 compra" : `${e.cantidad} compras`}
              </span>
              {comparacion && <span className="mt-0.5 block text-[13px] text-tenue">{comparacion}</span>}
            </span>
            <span className="text-[20px] font-bold tabular-nums">{pesos(e.total, { ceroComoGuion: false })}</span>
          </div>

          <ul className="mt-3 space-y-1">
            {e.categorias.slice(0, 3).map((c) => (
              <li key={c.categoria.id} className="flex items-center gap-3 py-1">
                <IconoCategoria nombre={c.categoria.nombre} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{c.categoria.nombre}</span>
                  <span className="block text-[13px] text-tenue">{Math.round(c.parte * 100)}% de lo suyo</span>
                </span>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums">{pesos(c.monto)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto border-t border-linea pt-3">
            {e.mayor && (
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-[13px] text-tenue">Su gasto más grande</span>
                  <span className="mt-0.5 block truncate text-[15px] font-medium">
                    {e.mayor.detalle || "Sin detalle"}, el {fechaCorta(e.mayor.fecha).slice(0, 5)}
                  </span>
                </span>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums">{pesos(e.mayor.monto)}</span>
              </div>
            )}
            {e.fijos > 0 && <p className="mt-2 text-[13px] text-tenue">Además pagó {pesos(e.fijos)} de pagos fijos.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function Renglon({ etiqueta, valor, fuerte = false, sangria = false }: { etiqueta: string; valor: string; fuerte?: boolean; sangria?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between ${sangria ? "pl-3 text-[14px]" : ""}`}>
      <dt className={fuerte ? "font-semibold" : "text-tenue"}>{etiqueta}</dt>
      <dd className={fuerte ? "font-bold" : "text-tenue"}>{valor}</dd>
    </div>
  );
}

/** Avatar que se toca para cargar una foto. Queda guardada solo en este celular. */
function FotoEditable({ id, nombre }: { id: string; nombre: string }) {
  const { fotos, setFoto } = useFotos();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <label className="relative block cursor-pointer rounded-full" aria-label={fotos[id] ? `Cambiar foto de ${nombre}` : `Agregar foto de ${nombre}`}>
        <Avatar id={id} nombre={nombre} tamano={52} />
        <span className="absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full bg-tarjeta text-texto ring-2 ring-tarjeta">
          <Icono trazo={CAMARA} className="size-4" />
        </span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const archivo = e.target.files?.[0];
            e.target.value = "";
            if (!archivo) return;
            try {
              setFoto(id, await prepararFoto(archivo));
              setError(null);
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo cargar la foto.");
            }
          }}
        />
      </label>
      {error && <p className="absolute left-0 top-full mt-1 w-48 text-[12px] text-pasaste">{error}</p>}
    </div>
  );
}

/**
 * Tarjeta que se da vuelta al tocarla, como la del perfil de Airbnb.
 * La tarjeta toma el alto de la cara visible: la otra sale del flujo. El cambio de alto
 * se hace a mitad del giro, cuando la tarjeta está de canto y no se ve.
 */
function TarjetaQueGira({ frente, dorso }: { frente: React.ReactNode; dorso: React.ReactNode }) {
  const [vuelta, setVuelta] = useState(false);
  const caraFrente = useRef<HTMLSpanElement>(null);
  const caraDorso = useRef<HTMLSpanElement>(null);
  const [alto, setAlto] = useState<number>();
  // La tarjeta cambia de alto al mismo ritmo que gira: empuja lo de abajo en vez de taparlo.
  useLayoutEffect(() => {
    const visible = (vuelta ? caraDorso : caraFrente).current;
    if (!visible) return;
    const medir = () => setAlto(visible.offsetHeight);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(visible);
    return () => obs.disconnect();
  }, [vuelta]);
  const cara = "absolute inset-x-0 top-0 flex flex-col rounded-3xl bg-tarjeta px-5 pb-5 pt-6 text-center shadow-tarjeta ring-1 ring-linea";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setVuelta((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setVuelta((v) => !v);
        }
      }}
      aria-pressed={vuelta}
      aria-label={vuelta ? "Tarjeta de ingresos. Tocá para volver a los gastos del mes" : "Tarjeta de gastos. Tocá para ver cuánto entra"}
      className="giro mx-5 mt-4 block cursor-pointer select-none text-left"
    >
      <span className="giro-interior relative block transition-[height] duration-[450ms] ease-[cubic-bezier(0.3,0.7,0.2,1)] motion-reduce:transition-none" style={{ height: alto }} data-dada-vuelta={vuelta}>
        <span ref={caraFrente} className={cara} aria-hidden={vuelta}>
          {frente}
          <span className="mt-4 flex items-center justify-center gap-1 text-[13px] font-semibold text-marca">
            Tocá para ver cuánto entra
            <Icono trazo={ICONOS.adelante} className="size-4" />
          </span>
        </span>
        <span ref={caraDorso} className={cara} aria-hidden={!vuelta}>
          {dorso}
          <span className="mt-4 flex items-center justify-center gap-1 text-[13px] font-semibold text-marca">
            <Icono trazo={ICONOS.atras} className="size-4" />
            Volver a los gastos
          </span>
        </span>
      </span>
    </div>
  );
}

/** Dorso: cuánto entra al hogar, de quién, y el dato del INDEC. */
function Ingresos({ entra, miembros }: { entra: number; miembros: RepartoMiembro[] }) {
  const dato = datoCurioso(entra);
  return (
    <>
      <MontoGrande monto={entra} className="text-[40px]" />
      <p className="mt-2 text-[14px] text-tenue">Entra al hogar por mes</p>
      <div className="mt-5 space-y-3 border-t border-linea pt-4 text-left">
        {miembros.map((m) => (
          <div key={m.miembroId} className="flex items-center gap-3">
            <Avatar id={m.miembroId} nombre={m.nombre} tamano={32} />
            <span className="flex-1 text-[15px] font-medium">{m.nombre}</span>
            <span className="text-right">
              <span className="block text-[15px] font-semibold tabular-nums">{pesos(m.ingresa, { ceroComoGuion: false })}</span>
              <span className="block text-[12px] text-tenue">{Math.round(m.proporcion * 100)}% del total</span>
            </span>
          </div>
        ))}
      </div>
      {entra > 0 && (
        <div className="mt-5 rounded-2xl bg-marca-suave p-4 text-left">
          <p className="text-[15px] font-semibold text-marca">{dato.titulo}</p>
          <p className="mt-1 text-[13px] leading-5 text-tenue">{dato.detalle}</p>
          <a
            href={FUENTE_URL}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-2 inline-block text-[13px] font-semibold text-marca underline underline-offset-2"
          >
            Ver el informe del INDEC
          </a>
        </div>
      )}
    </>
  );
}
