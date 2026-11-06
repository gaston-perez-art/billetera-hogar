"use client";

// Modo nube: datos en Supabase, compartidos entre los dos celulares.
// Cada cambio se muestra al instante (aplicando la misma operación que el modo demo)
// y se guarda en la base; cuando la base confirma, se recarga lo que quedó guardado.

import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Acceso } from "@/components/Acceso";
import { ContextoBilletera, PantallaCentrada, type Billetera } from "./contexto";
import { hoy, mesDe } from "./formato";
import { cargarHogar, filasADatos, prepararImportacion, type Filas } from "./nube";
import * as op from "./operaciones";
import type { Datos, Mes } from "./tipos";

const TABLAS = ["categorias", "techos", "ingresos", "movimientos", "pagos_fijos", "pagos_mes"];

type Miembro = { id: string; hogar_id: string; nombre: string };

export function ProveedorNube({ sb, children }: { sb: SupabaseClient; children: React.ReactNode }) {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined);
  const [miembro, setMiembro] = useState<Miembro | null | undefined>(undefined);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = sb.auth.onAuthStateChange((_evento, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  const userId = sesion?.user.id;
  useEffect(() => {
    if (!userId) return setMiembro(undefined);
    sb.from("miembros")
      .select("id, hogar_id, nombre")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setMiembro(data ?? null));
  }, [sb, userId]);

  if (sesion === undefined) return <PantallaCentrada>Cargando…</PantallaCentrada>;
  if (!sesion) return <Acceso sb={sb} />;
  if (miembro === undefined) return <PantallaCentrada>Cargando…</PantallaCentrada>;
  if (!miembro) {
    return (
      <PantallaCentrada>
        <div className="space-y-4">
          <p>Entraste como {sesion.user.email}, pero esa cuenta todavía no está en un hogar.</p>
          <button onClick={() => sb.auth.signOut()} className="font-semibold text-marca">
            Salir
          </button>
        </div>
      </PantallaCentrada>
    );
  }
  return (
    <Hogar sb={sb} miembro={miembro} email={sesion.user.email}>
      {children}
    </Hogar>
  );
}

function Hogar({ sb, miembro, email, children }: { sb: SupabaseClient; miembro: Miembro; email?: string; children: React.ReactNode }) {
  const hogarId = miembro.hogar_id;
  const [filas, setFilas] = useState<Filas | null>(null);
  const [optimista, setOptimista] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mes, setMes] = useState<Mes>(() => mesDe(hoy()));
  const pendientes = useRef(0);
  const ultimaCarga = useRef(0);

  const base = useMemo(() => (filas ? filasADatos(filas, mes) : null), [filas, mes]);
  const baseRef = useRef(base);
  baseRef.current = base;
  const datos = optimista ?? base;

  const recargar = useCallback(async () => {
    const turno = ++ultimaCarga.current;
    try {
      const nuevas = await cargarHogar(sb, hogarId);
      if (turno !== ultimaCarga.current) return; // llegó una carga más nueva
      setFilas(nuevas);
      if (pendientes.current === 0) setOptimista(null);
    } catch {
      setError("No pudimos traer los datos. Revisá la conexión.");
    }
  }, [sb, hogarId]);

  // Carga inicial, cambios en vivo del otro celular y recarga al volver a la app
  // (el celular corta la conexión en vivo cuando la app queda en segundo plano).
  useEffect(() => {
    recargar();
    let espera: ReturnType<typeof setTimeout> | undefined;
    const programar = () => {
      clearTimeout(espera);
      espera = setTimeout(recargar, 250);
    };
    const canal = sb.channel(`hogar-${hogarId}`);
    for (const table of TABLAS) {
      canal.on("postgres_changes", { event: "*", schema: "public", table, filter: `hogar_id=eq.${hogarId}` }, programar);
    }
    canal.subscribe();
    const alVolver = () => document.visibilityState === "visible" && programar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearTimeout(espera);
      document.removeEventListener("visibilitychange", alVolver);
      sb.removeChannel(canal);
    };
  }, [sb, hogarId, recargar]);

  /** Muestra el cambio ya y lo guarda; si la base lo rechaza, la recarga lo deshace. */
  const ejecutar = useCallback(
    async (cambio: (d: Datos) => Datos, guardar: () => PromiseLike<{ error: unknown }>) => {
      pendientes.current++;
      setOptimista((prev) => {
        const actual = prev ?? baseRef.current;
        return actual ? cambio(actual) : prev;
      });
      try {
        const { error } = await guardar();
        if (error) throw error;
      } catch {
        setError("No se pudo guardar el cambio. Probá de nuevo.");
      } finally {
        pendientes.current--;
        await recargar();
      }
    },
    [recargar],
  );

  const valor = useMemo<Billetera | null>(() => {
    if (!datos) return null;
    const usuarioId = miembro.id;
    return {
      modo: "nube",
      email,
      datos,
      usuarioId,
      mes,
      setMes,

      agregarMovimiento: (m) => {
        const id = op.nuevoId();
        ejecutar(
          (d) => op.agregarMovimiento(d, { ...m, id, creadoEn: new Date().toISOString() }),
          () =>
            sb.from("movimientos").insert({
              id,
              hogar_id: hogarId,
              fecha: m.fecha,
              monto: m.monto,
              categoria_id: m.categoriaId,
              detalle: m.detalle || null,
              medio: m.medio ?? null,
              pago_por: m.pagoPor,
            }),
        );
      },

      borrarMovimiento: (id) =>
        ejecutar((d) => op.borrarMovimiento(d, id), () => sb.from("movimientos").delete().eq("id", id)),

      marcarPagado: (pagoFijoId, mesPago) => {
        const pf = datos.pagosFijos.find((p) => p.id === pagoFijoId);
        if (!pf) return;
        const movimientoId = op.nuevoId();
        ejecutar(
          (d) => op.marcarPagado(d, pagoFijoId, mesPago, usuarioId, movimientoId),
          () =>
            sb.rpc("marcar_pagado", {
              p_pago_fijo: pagoFijoId,
              p_mes: mesPago,
              p_pago_por: usuarioId,
              p_fecha: op.fechaDePago(mesPago, pf.dia),
              p_movimiento: movimientoId,
            }),
        );
      },

      desmarcarPagado: (pagoFijoId, mesPago) =>
        ejecutar(
          (d) => op.desmarcarPagado(d, pagoFijoId, mesPago),
          () => sb.rpc("desmarcar_pagado", { p_pago_fijo: pagoFijoId, p_mes: mesPago }),
        ),

      // El techo se guarda en el mes elegido y sigue valiendo en los meses siguientes.
      actualizarTecho: (categoriaId, techo) =>
        ejecutar(
          (d) => op.actualizarTecho(d, categoriaId, techo),
          () =>
            sb
              .from("techos")
              .upsert({ hogar_id: hogarId, categoria_id: categoriaId, mes, monto: techo }, { onConflict: "categoria_id,mes" }),
        ),

      actualizarIngreso: (ingresoId, monto) =>
        ejecutar((d) => op.actualizarIngreso(d, ingresoId, monto), () => sb.from("ingresos").update({ monto }).eq("id", ingresoId)),

      actualizarPagoFijo: (pagoFijoId, cambios) =>
        ejecutar(
          (d) => op.actualizarPagoFijo(d, pagoFijoId, cambios),
          () => sb.from("pagos_fijos").update(cambios).eq("id", pagoFijoId),
        ),

      // Reemplaza todo lo del hogar. Si falla, no se borra nada (es una sola transacción).
      importarDatos: async (nuevos) => {
        const preparados = prepararImportacion(nuevos, datos.miembros, mesDe(hoy()));
        const { error } = await sb.rpc("importar_datos", { p_hogar: hogarId, p_datos: preparados });
        if (error) throw new Error("No se pudo importar el archivo. No se cambió nada.");
        await recargar();
      },

      cerrarSesion: () => sb.auth.signOut(),
    };
  }, [datos, miembro.id, email, mes, sb, hogarId, ejecutar, recargar]);

  if (!valor) {
    return <PantallaCentrada>{error ?? "Cargando…"}</PantallaCentrada>;
  }
  return (
    <ContextoBilletera.Provider value={valor}>
      {error && (
        <button
          onClick={() => setError(null)}
          className="fixed inset-x-4 top-[max(env(safe-area-inset-top),0.75rem)] z-50 mx-auto max-w-md rounded-2xl bg-tarjeta px-4 py-3 text-left text-[14px] font-medium text-pasaste shadow-lg"
        >
          {error} <span className="text-tenue">Tocá para cerrar.</span>
        </button>
      )}
      {children}
    </ContextoBilletera.Provider>
  );
}
