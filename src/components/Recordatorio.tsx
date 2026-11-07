"use client";

// Recordatorio para cargar los gastos (modal centrado con ilustración, al abrir la app).
// Aparece si quien usa la app:
// - no cargó nada en las últimas 12 horas, o
// - entra pasadas las 23 y todavía no cargó nada hoy.
// "Hoy no gasté nada", la X o tocar afuera lo calla hasta mañana (o hasta las 23, si se cerró antes).
// Es una preferencia de cada celular: se guarda en el navegador.

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icono, ICONOS } from "@/components/Iconos";
import { IlustracionRecordatorio } from "@/components/Ilustracion";
import { Boton, Modal } from "@/components/ui";
import { motivoRecordatorio, type Motivo } from "@/lib/recordatorio";
import { useBilletera } from "@/lib/store";

const CLAVE = "billetera-hogar:recordatorio-cerrado";
// Prueba única (pedida por Gastón): se le muestra una vez en cada celular, aunque no toque
// por la regla, para ver cómo queda. Después sigue la regla normal. Se puede borrar más adelante.
// Cambiar la versión al final de la clave vuelve a mostrar la prueba una vez (v2: modal centrado).
const CLAVE_PRUEBA = "billetera-hogar:recordatorio-prueba-v2";
const NOMBRE_PRUEBA = "Gastón";

function pruebaPendiente(nombre: string): boolean {
  if (nombre !== NOMBRE_PRUEBA) return false;
  try {
    return !localStorage.getItem(CLAVE_PRUEBA);
  } catch {
    return false;
  }
}

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
    const motivo = motivoRecordatorio(clave ? clave.split("|") : [], new Date(), leerCerrado());
    setMotivo(motivo ?? (pruebaPendiente(nombre) ? "sin-cargar" : null));
  }, [clave, nombre]);

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
      if (nombre === NOMBRE_PRUEBA) localStorage.setItem(CLAVE_PRUEBA, "1");
    } catch {
      // Sin storage: vuelve a aparecer la próxima vez.
    }
    setMotivo(null);
  };

  const titulo = motivo === "noche" ? `Antes de dormir, ${nombre}` : `¿Cargaste lo último, ${nombre}?`;
  const texto =
    motivo === "noche"
      ? "Hoy todavía no cargaste nada. Si gastaste algo, cargalo ahora que te acordás: son tres toques."
      : "Hace más de 12 horas que no cargás nada. Si gastaste algo, cargalo así las cuentas de los dos dan bien.";

  return (
    <Modal abierta={motivo !== null} alCerrar={cerrar} titulo="Recordatorio para cargar" imagen={<IlustracionRecordatorio />}>
      <h2 className="text-[22px] font-bold leading-7 tracking-[-0.01em]">{titulo}</h2>
      <p className="mt-2 text-[15px] leading-[22px] text-tenue">{texto}</p>
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
    </Modal>
  );
}
