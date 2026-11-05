"use client";

import { useState } from "react";
import { Icono, IconoCategoria, ICONOS } from "@/components/Iconos";
import { Encabezado, Tarjeta } from "@/components/ui";
import { leerDatosImportados } from "@/lib/importar";
import { useBilletera } from "@/lib/store";

const numero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export default function Ajustes() {
  const { datos, actualizarIngreso, actualizarTecho, actualizarPagoFijo, reiniciarDemo, importarDatos } = useBilletera();
  const [avisoImportar, setAvisoImportar] = useState<{ ok: boolean; texto: string } | null>(null);

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    try {
      const nuevos = leerDatosImportados(await archivo.text());
      if (!confirm(`¿Reemplazar todo lo de este celular con "${archivo.name}"?`)) return;
      importarDatos(nuevos);
      setAvisoImportar({ ok: true, texto: `Listo: ${nuevos.movimientos.length} gastos importados.` });
    } catch (error) {
      setAvisoImportar({ ok: false, texto: error instanceof Error ? error.message : "No se pudo leer el archivo." });
    }
  }
  const nombre = (id: string) => datos.miembros.find((m) => m.id === id)?.nombre;
  const categorias = [...datos.categorias].sort((a, b) => a.orden - b.orden);
  const pagos = [...datos.pagosFijos].sort((a, b) => a.dia - b.dia);

  return (
    <>
      <Encabezado titulo="Ajustes" conMes={false} />
      <main className="space-y-4 px-4 pt-5">
        <Seccion titulo="Ingresos mensuales">
          {datos.ingresos
            .filter((i) => i.mes === null)
            .map((i) => (
              <CampoMonto key={i.id} etiqueta={i.concepto} detalle={nombre(i.miembroId)} valor={i.monto} onCambio={(v) => actualizarIngreso(i.id, v)} />
            ))}
        </Seccion>

        <Seccion titulo="Techos por categoría" nota="El techo de Deuda se suma solo con las cuotas fijas marcadas como deuda.">
          {categorias.map((c) => (
            <CampoMonto key={c.id} etiqueta={c.nombre} icono={c.nombre} valor={c.techo} onCambio={(v) => actualizarTecho(c.id, v)} />
          ))}
        </Seccion>

        <Seccion titulo="Pagos fijos">
          {pagos.map((p) => (
            <div key={p.id} className="flex gap-3 py-3">
              <input
                type="checkbox"
                checked={p.activo}
                onChange={(e) => actualizarPagoFijo(p.id, { activo: e.target.checked })}
                aria-label={`${p.concepto} activo`}
                className="mt-0.5 size-5 shrink-0 accent-[#10372a]"
              />
              <div className="min-w-0 flex-1">
                <p className={`text-[15px] font-semibold leading-5 ${p.activo ? "" : "text-tenue line-through"}`}>{p.concepto}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-sm text-tenue">
                    Día
                    <input
                      type="number"
                      min={1}
                      max={31}
                      key={p.dia}
                      defaultValue={p.dia}
                      onBlur={(e) => {
                        const dia = Math.min(31, Math.max(1, Number(e.target.value) || p.dia));
                        e.target.value = String(dia);
                        actualizarPagoFijo(p.id, { dia });
                      }}
                      className="w-11 rounded-xl bg-fondo px-1.5 py-2 text-center text-sm font-semibold text-texto outline-none"
                    />
                  </label>
                  <InputMonto key={p.monto} valor={p.monto} onCambio={(monto) => actualizarPagoFijo(p.id, { monto })} />
                </div>
              </div>
            </div>
          ))}
        </Seccion>

        <Tarjeta>
          <h2 className="text-lg font-bold tracking-tight">Importar datos</h2>
          <p className="mt-1 text-sm text-tenue">
            Cargá un archivo .json de la billetera. Los datos quedan solo en este navegador.
          </p>
          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-full bg-bosque py-3 text-sm font-bold text-white">
            <Icono trazo={ICONOS.archivo} className="size-5" />
            Elegir archivo
            <input type="file" accept=".json,application/json" onChange={alElegirArchivo} className="sr-only" />
          </label>
          {avisoImportar && (
            <p className={`mt-2 text-sm ${avisoImportar.ok ? "text-queda" : "text-pasaste"}`}>{avisoImportar.texto}</p>
          )}
        </Tarjeta>

        <Tarjeta>
          <h2 className="text-lg font-bold tracking-tight">Datos de demo</h2>
          <p className="mt-1 text-sm text-tenue">
            En este POC todo se guarda en este navegador. Reiniciar borra lo cargado y vuelve a los datos de ejemplo.
          </p>
          <button
            onClick={() => confirm("¿Borrar todo y volver a los datos de demo?") && reiniciarDemo()}
            className="mt-4 w-full rounded-full bg-pasaste-suave py-3 text-sm font-bold text-pasaste"
          >
            Reiniciar demo
          </button>
        </Tarjeta>
      </main>
    </>
  );
}

function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <Tarjeta>
      <h2 className="text-lg font-bold tracking-tight">{titulo}</h2>
      {nota && <p className="mt-1 text-sm text-tenue">{nota}</p>}
      <div className="mt-2 divide-y divide-linea">{children}</div>
    </Tarjeta>
  );
}

function CampoMonto({
  etiqueta,
  detalle,
  icono,
  valor,
  onCambio,
}: {
  etiqueta: string;
  detalle?: string;
  icono?: string;
  valor: number;
  onCambio: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      {icono && <IconoCategoria nombre={icono} tamano="sm" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{etiqueta}</span>
        {detalle && <span className="block text-sm text-tenue">{detalle}</span>}
      </span>
      <InputMonto key={valor} valor={valor} onCambio={onCambio} />
    </div>
  );
}

/** Guarda al salir del campo. Acepta "1.234.567" o "1234567". */
function InputMonto({ valor, onCambio }: { valor: number; onCambio: (v: number) => void }) {
  const [texto, setTexto] = useState(numero.format(valor));
  return (
    <label className="flex items-center rounded-xl bg-fondo px-3 py-2 text-sm font-semibold">
      <span className="text-tenue">$</span>
      <input
        inputMode="numeric"
        value={texto}
        onChange={(e) => setTexto(e.target.value.replace(/[^\d.]/g, ""))}
        onBlur={() => {
          const v = Number(texto.replace(/\./g, "")) || 0;
          setTexto(numero.format(v));
          if (v !== valor) onCambio(v);
        }}
        className="w-24 bg-transparent text-right tabular-nums outline-none"
      />
    </label>
  );
}
