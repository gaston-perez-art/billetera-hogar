"use client";

import { useState } from "react";
import { Boton, Encabezado, Grupo } from "@/components/ui";
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
      <main className="space-y-8 pt-2">
        <Grupo titulo="Ingresos por mes">
          {datos.ingresos
            .filter((i) => i.mes === null)
            .map((i) => (
              <CampoMonto key={i.id} etiqueta={i.concepto} detalle={nombre(i.miembroId)} valor={i.monto} onCambio={(v) => actualizarIngreso(i.id, v)} />
            ))}
        </Grupo>

        <div>
          <Grupo titulo="Techo por categoría">
            {categorias.map((c) => (
              <CampoMonto key={c.id} etiqueta={c.nombre} valor={c.techo} onCambio={(v) => actualizarTecho(c.id, v)} />
            ))}
          </Grupo>
          <p className="mt-2 px-5 text-[13px] text-tenue">El techo de Deuda se arma solo con las cuotas fijas marcadas como deuda.</p>
        </div>

        <Grupo titulo="Pagos fijos">
          {pagos.map((p) => (
            <div key={p.id} className="px-4 py-3">
              <label className="flex items-center justify-between gap-3">
                <span className={`min-w-0 text-[15px] font-medium ${p.activo ? "" : "text-tenue line-through"}`}>{p.concepto}</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={p.activo}
                  onChange={(e) => actualizarPagoFijo(p.id, { activo: e.target.checked })}
                  aria-label={`${p.concepto} activo`}
                  className="size-5 shrink-0 accent-marca"
                />
              </label>
              <div className="mt-2 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-[13px] text-tenue">
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
                    className="h-9 w-12 rounded-lg bg-relleno text-center text-[15px] font-medium text-texto outline-none"
                  />
                </label>
                <InputMonto key={p.monto} valor={p.monto} onCambio={(monto) => actualizarPagoFijo(p.id, { monto })} />
              </div>
            </div>
          ))}
        </Grupo>

        <section className="space-y-3 px-4">
          <h2 className="px-1 text-[15px] font-semibold">Datos</h2>
          <label className="flex h-[52px] cursor-pointer items-center justify-center rounded-xl bg-relleno text-[16px] font-semibold active:opacity-80">
            Importar archivo .json
            <input type="file" accept=".json,application/json" onChange={alElegirArchivo} className="sr-only" />
          </label>
          {avisoImportar && (
            <p className={`px-1 text-[13px] ${avisoImportar.ok ? "text-queda" : "text-pasaste"}`}>{avisoImportar.texto}</p>
          )}
          <Boton variante="peligro" onClick={() => confirm("¿Borrar todo y volver a los datos de demo?") && reiniciarDemo()}>
            Volver a los datos de demo
          </Boton>
          <p className="px-1 text-[13px] text-tenue">Todo se guarda solo en este navegador.</p>
        </section>
      </main>
    </>
  );
}

function CampoMonto({ etiqueta, detalle, valor, onCambio }: { etiqueta: string; detalle?: string; valor: number; onCambio: (v: number) => void }) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{etiqueta}</span>
        {detalle && <span className="block text-[13px] text-tenue">{detalle}</span>}
      </span>
      <InputMonto key={valor} valor={valor} onCambio={onCambio} />
    </div>
  );
}

/** Guarda al salir del campo. Acepta "1.234.567" o "1234567". */
function InputMonto({ valor, onCambio }: { valor: number; onCambio: (v: number) => void }) {
  const [texto, setTexto] = useState(numero.format(valor));
  return (
    <label className="flex h-9 items-center rounded-lg bg-relleno px-3 text-[15px] font-medium">
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
