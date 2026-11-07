"use client";

// Recordatorio para cargar los gastos (una hoja desde abajo, al abrir la app).
// Aparece si quien usa la app:
// - no cargó nada en las últimas 24 horas, o
// - entra pasadas las 23 y todavía no cargó nada hoy.
// "Hoy no gasté nada" o cerrar lo calla hasta mañana (o hasta las 23, si se cerró antes).
// Es una preferencia de cada celular: se guarda en el navegador.

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icono, ICONOS } from "@/components/Iconos";
import { Boton, Hoja } from "@/components/ui";
import { motivoRecordatorio, type Motivo } from "@/lib/recordatorio";
import { useBilletera } from "@/lib/store";

const CLAVE = "billetera-hogar:recordatorio-cerrado";

function leerCerrado(): Date | null {
  try {
    const v = localStorage.getItem(CLAVE);
    return v ? new Date(v) : null;
  } catch {
    return null;
  }
}

export function Recordatorio() {
  const router = useRouter();
  const { datos, usuarioId } = useBilletera();
  const [motivo, setMotivo] = useState<Motivo | null>(null);
  const nombre = datos.miembros.find((m) => m.id === usuarioId)?.nombre ?? "";

  const cargas = datos.movimientos.filter((m) => m.pagoPor === usuarioId).map((m) => m.creadoEn);
  const clave = cargas.join("|");
  const revisar = useCallback(() => {
    setMotivo(motivoRecordatorio(clave ? clave.split("|") : [], new Date(), leerCerrado()));
  }, [clave]);

  useEffect(() => {
    // Un respiro para que la pantalla aparezca antes que la hoja.
    const t = setTimeout(revisar, 600);
    const alVolver = () => document.visibilityState === "visible" && revisar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [revisar]);

  const cerrar = () => {
    try {
      localStorage.setItem(CLAVE, new Date().toISOString());
    } catch {
      // Sin storage: vuelve a aparecer la próxima vez.
    }
    setMotivo(null);
  };

  const titulo = motivo === "noche" ? `Antes de dormir, ${nombre}` : `¿Cargaste lo último, ${nombre}?`;
  const texto =
    motivo === "noche"
      ? "Hoy todavía no cargaste nada. Si gastaste algo, cargalo ahora que te acordás: son tres toques."
      : "Hace más de un día que no cargás nada. Si gastaste algo, cargalo así las cuentas de los dos dan bien.";

  return (
    <Hoja abierta={motivo !== null} alCerrar={cerrar} titulo="Recordatorio para cargar">
      <div className="pb-1 pt-2 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-marca-suave text-marca">
          <Icono trazo={ICONOS.campana} className="size-7" />
        </span>
        <h2 className="mt-4 text-[22px] font-bold tracking-[-0.01em]">{titulo}</h2>
        <p className="mx-auto mt-2 max-w-[300px] text-[15px] leading-[22px] text-tenue">{texto}</p>
      </div>
      <div className="mt-6 space-y-2.5">
        <Boton
          onClick={() => {
            cerrar();
            router.push("/cargar");
          }}
        >
          <Icono trazo={ICONOS.mas} className="size-5" />
          Cargar un gasto
        </Boton>
        <Boton variante="secundario" onClick={cerrar}>
          Hoy no gasté nada
        </Boton>
      </div>
    </Hoja>
  );
}
