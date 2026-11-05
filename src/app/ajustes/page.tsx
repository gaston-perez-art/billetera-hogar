"use client";

import { useState } from "react";
import { Encabezado, Tarjeta } from "@/components/ui";
import { useBilletera } from "@/lib/store";

const numero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export default function Ajustes() {
  const { datos, actualizarIngreso, actualizarTecho, actualizarPagoFijo, reiniciarDemo } = useBilletera();
  const nombre = (id: string) => datos.miembros.find((m) => m.id === id)?.nombre;
  const categorias = [...datos.categorias].sort((a, b) => a.orden - b.orden);
  const pagos = [...datos.pagosFijos].sort((a, b) => a.dia - b.dia);

  return (
    <>
      <Encabezado titulo="Ajustes" conMes={false} />
      <main className="space-y-4 px-4 pt-4">
        <Seccion titulo="Ingresos mensuales">
          {datos.ingresos
            .filter((i) => i.mes === null)
            .map((i) => (
              <CampoMonto key={i.id} etiqueta={`${nombre(i.miembroId)} · ${i.concepto}`} valor={i.monto} onCambio={(v) => actualizarIngreso(i.id, v)} />
            ))}
        </Seccion>

        <Seccion titulo="Techos por categoría" nota="El techo de Deuda se suma solo con las cuotas fijas marcadas como deuda.">
          {categorias.map((c) => (
            <CampoMonto key={c.id} etiqueta={c.nombre} valor={c.techo} onCambio={(v) => actualizarTecho(c.id, v)} />
          ))}
        </Seccion>

        <Seccion titulo="Pagos fijos">
          {pagos.map((p) => (
            <div key={p.id} className="flex items-center gap-2 py-1.5">
              <input
                type="checkbox"
                checked={p.activo}
                onChange={(e) => actualizarPagoFijo(p.id, { activo: e.target.checked })}
                aria-label={`${p.concepto} activo`}
                className="accent-marca"
              />
              <span className={`flex-1 truncate text-sm ${p.activo ? "" : "text-tenue line-through"}`}>{p.concepto}</span>
              <label className="flex items-center gap-1 text-xs text-tenue">
                día
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
                  className="w-10 rounded-lg bg-fondo px-1.5 py-1 text-center text-sm text-texto outline-none"
                />
              </label>
              <InputMonto key={p.monto} valor={p.monto} onCambio={(monto) => actualizarPagoFijo(p.id, { monto })} />
            </div>
          ))}
        </Seccion>

        <Tarjeta>
          <h2 className="font-semibold">Datos de demo</h2>
          <p className="mt-1 text-sm text-tenue">
            En este POC todo se guarda en este navegador. Reiniciar borra lo cargado y vuelve a los datos de ejemplo.
          </p>
          <button
            onClick={() => confirm("¿Borrar todo y volver a los datos de demo?") && reiniciarDemo()}
            className="mt-3 rounded-xl bg-pasaste-suave px-4 py-2 text-sm font-medium text-pasaste"
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
      <h2 className="mb-1 font-semibold">{titulo}</h2>
      {nota && <p className="mb-2 text-xs text-tenue">{nota}</p>}
      <div className="divide-y divide-linea">{children}</div>
    </Tarjeta>
  );
}

function CampoMonto({ etiqueta, valor, onCambio }: { etiqueta: string; valor: number; onCambio: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm">{etiqueta}</span>
      <InputMonto key={valor} valor={valor} onCambio={onCambio} />
    </div>
  );
}

/** Guarda al salir del campo. Acepta "1.234.567" o "1234567". */
function InputMonto({ valor, onCambio }: { valor: number; onCambio: (v: number) => void }) {
  const [texto, setTexto] = useState(numero.format(valor));
  return (
    <label className="flex items-center rounded-lg bg-fondo px-2 py-1 text-sm">
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
