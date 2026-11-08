// Pantalla de carga con la forma de Inicio: encabezado, chip del mes, tarjeta principal,
// los dos botones y la actividad. Así, al llegar los datos, nada salta de lugar.
// Solo usa tokens (línea sobre tarjeta) y un latido suave que se apaga con "reducir movimiento".

function Bloque({ className = "" }: { className?: string }) {
  return <span className={`block rounded-full bg-linea ${className}`} />;
}

const TARJETA = "superficie shadow-tarjeta ring-1 ring-linea";

export function PantallaCargando() {
  return (
    <div className="mx-auto min-h-dvh max-w-md esqueleto" role="status" aria-live="polite" aria-label="Cargando">
      <div className="px-5 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="flex min-h-12 items-center justify-between">
          <div className={`flex h-10 w-40 items-center gap-2 rounded-full pl-1 ${TARJETA}`}>
            <Bloque className="size-8" />
            <Bloque className="h-3.5 w-20" />
          </div>
          <div className="flex gap-2">
            <span className={`size-10 rounded-full ${TARJETA}`} />
            <span className={`size-10 rounded-full ${TARJETA}`} />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Bloque className="h-9 w-44" />
          <Bloque className="h-9 w-24" />
        </div>
      </div>

      <section className={`mx-5 mt-4 flex flex-col items-center rounded-3xl px-5 pb-5 pt-7 ${TARJETA}`}>
        <Bloque className="h-10 w-44 rounded-xl" />
        <Bloque className="mt-3 h-3.5 w-32" />
        <div className="mt-6 grid w-full grid-cols-2 gap-6 border-t border-linea pt-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Bloque className="h-3 w-16" />
              <Bloque className="h-4 w-24" />
            </div>
          ))}
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3 px-5">
        <Bloque className="h-[52px]" />
        <Bloque className="h-[52px]" />
      </div>

      <div className="mt-8 px-6">
        <Bloque className="h-4 w-28" />
      </div>
      <div className={`mx-5 mt-3 rounded-3xl py-1 ${TARJETA}`}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
            <Bloque className="size-11" />
            <div className="flex-1 space-y-2">
              <Bloque className={`h-3.5 ${i % 2 ? "w-28" : "w-36"}`} />
              <Bloque className="h-3 w-20" />
            </div>
            <Bloque className="h-3.5 w-16" />
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
