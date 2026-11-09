"use client";

// Modo nube: datos en Supabase, compartidos entre los dos celulares.
// Cada cambio se muestra al instante (aplicando la misma operación que el modo demo)
// y se guarda en la base; cuando la base confirma, se recarga lo que quedó guardado.

import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Acceso } from "@/components/Acceso";
import { PantallaCargando } from "@/components/Esqueleto";
import { ContextoBilletera, PantallaCentrada, type Billetera } from "./contexto";
import { hoy, mesDe } from "./formato";
import { fotosLocales, olvidarFotoLocal } from "./fotos";
import { cargarHogar, filasADatos, prepararImportacion, type Filas } from "./nube";
import * as op from "./operaciones";
import { useMontosOcultos } from "./privacidad";
import type { Datos, Mes } from "./tipos";

const TABLAS = ["miembros", "categorias", "techos", "ingresos", "movimientos", "pagos_fijos", "pagos_mes"];

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

  if (sesion === undefined) return <PantallaCargando />;
  if (!sesion) return <Acceso sb={sb} />;
  if (miembro === undefined) return <PantallaCargando />;
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
  const privacidad = useMontosOcultos();
  const pendientes = useRef(0);
  // Una compra con tarjeta nueva: el pago espera a que la tarjeta esté guardada (si no, la base lo rechaza).
  const tarjetaGuardandose = useRef<PromiseLike<unknown>>(Promise.resolve());
  // Ídem con una categoría nueva (la de Ahorro se crea al apartar por primera vez).
  const categoriaGuardandose = useRef<PromiseLike<unknown>>(Promise.resolve());
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
    // Tarjetas en un canal aparte: si todavía no se corrió 0007_tarjetas.sql, no afecta al resto.
    const canalTarjetas = sb
      .channel(`hogar-${hogarId}-tarjetas`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tarjetas", filter: `hogar_id=eq.${hogarId}` }, programar)
      .subscribe();
    const alVolver = () => document.visibilityState === "visible" && programar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearTimeout(espera);
      document.removeEventListener("visibilitychange", alVolver);
      sb.removeChannel(canal);
      sb.removeChannel(canalTarjetas);
    };
  }, [sb, hogarId, recargar]);

  // Fotos que quedaron solo en este navegador (versión anterior): se suben una vez a la nube.
  const fotosSubidas = useRef(false);
  useEffect(() => {
    if (!filas || fotosSubidas.current) return;
    fotosSubidas.current = true;
    const locales = fotosLocales();
    for (const m of filas.miembros) {
      const local = locales[m.id];
      if (!local) continue;
      if (m.foto) {
        olvidarFotoLocal(m.id);
        continue;
      }
      sb.rpc("guardar_foto", { p_miembro: m.id, p_foto: local }).then(({ error }) => {
        if (!error) olvidarFotoLocal(m.id);
      });
    }
  }, [filas, sb]);

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
      montosOcultos: privacidad.ocultos,
      alternarMontosOcultos: privacidad.alternar,
      email,
      datos,
      usuarioId,
      mes,
      setMes,

      agregarMovimiento: (m) => {
        const id = op.nuevoId();
        ejecutar(
          (d) => op.agregarMovimiento(d, { ...m, id, creadoEn: new Date().toISOString() }),
          async () => {
            await categoriaGuardandose.current;
            return sb.from("movimientos").insert({
              id,
              hogar_id: hogarId,
              fecha: m.fecha,
              monto: m.monto,
              categoria_id: m.categoriaId,
              detalle: m.detalle || null,
              medio: m.medio ?? null,
              pago_por: m.pagoPor,
            });
          },
        );
      },

      editarMovimiento: (id, cambios) => {
        const nuevo = op.editarMovimiento(datos, id, cambios).movimientos.find((m) => m.id === id);
        if (!nuevo) return;
        const deUnPago = datos.pagosMes.some((p) => p.movimientoId === id);
        ejecutar(
          (d) => op.editarMovimiento(d, id, cambios),
          async () => {
            const r = await sb.from("movimientos").update({ monto: nuevo.monto, detalle: nuevo.detalle || null }).eq("id", id);
            if (r.error || !deUnPago) return r;
            return await sb.from("pagos_mes").update({ monto: nuevo.monto }).eq("movimiento_id", id);
          },
        );
      },

      borrarMovimiento: (id) =>
        ejecutar((d) => op.borrarMovimiento(d, id), () => sb.from("movimientos").delete().eq("id", id)),

      marcarPagado: (pagoFijoId, mesPago, monto, usd) => {
        const pf = datos.pagosFijos.find((p) => p.id === pagoFijoId);
        if (!pf || datos.pagosMes.some((p) => p.pagoFijoId === pagoFijoId && p.mes === mesPago && p.pagado)) return;
        const movimientoId = op.nuevoId();
        // Lo que queda guardado ese mes (en dólares: pesos y USD, aunque no se hayan pasado).
        const despues = op.marcarPagado(datos, pagoFijoId, mesPago, usuarioId, movimientoId, undefined, monto, usd);
        const registro = despues.pagosMes.find((p) => p.pagoFijoId === pagoFijoId && p.mes === mesPago);
        const cuotas = despues.pagosFijos.find((p) => p.id === pagoFijoId)?.cuotas;
        const enDolares = registro?.usd != null;
        ejecutar(
          (d) => op.marcarPagado(d, pagoFijoId, mesPago, usuarioId, movimientoId, undefined, monto, usd),
          async () => {
            // Monto de este mes primero (marcar_pagado usa el del mes si hay), después el pago.
            if (monto !== undefined || enDolares) {
              const r = await sb
                .from("pagos_mes")
                .upsert(
                  {
                    hogar_id: hogarId,
                    pago_fijo_id: pagoFijoId,
                    mes: mesPago,
                    monto: registro?.monto ?? monto,
                    pagado: false,
                    ...(enDolares ? { usd: registro.usd } : {}),
                  },
                  { onConflict: "pago_fijo_id,mes" },
                );
              if (r.error) return r;
            }
            const r = await sb.rpc("marcar_pagado", {
              p_pago_fijo: pagoFijoId,
              p_mes: mesPago,
              p_pago_por: usuarioId,
              p_fecha: op.fechaDePago(mesPago, pf.dia),
              p_movimiento: movimientoId,
            });
            // Si se puso más que el mínimo, termina antes: queda guardado para el detalle de las próximas.
            if (r.error || !enDolares || cuotas === pf.cuotas) return r;
            return await sb.from("pagos_fijos").update({ cuotas }).eq("id", pagoFijoId);
          },
        );
      },

      desmarcarPagado: (pagoFijoId, mesPago) =>
        ejecutar(
          (d) => op.desmarcarPagado(d, pagoFijoId, mesPago),
          () => sb.rpc("desmarcar_pagado", { p_pago_fijo: pagoFijoId, p_mes: mesPago }),
        ),

      agregarCategoria: (nombre) => {
        const id = op.nuevoId();
        const orden = Math.max(-1, ...datos.categorias.map((c) => c.orden)) + 1;
        ejecutar(
          (d) => op.agregarCategoria(d, id, nombre),
          () => {
            const guardado = sb.from("categorias").insert({ id, hogar_id: hogarId, nombre, orden }).then((r) => r);
            categoriaGuardandose.current = guardado;
            return guardado;
          },
        );
        return id;
      },

      // El techo se guarda en el mes elegido y sigue valiendo en los meses siguientes.
      actualizarTecho: (categoriaId, techo) =>
        ejecutar(
          (d) => op.actualizarTecho(d, categoriaId, techo),
          () =>
            sb
              .from("techos")
              .upsert({ hogar_id: hogarId, categoria_id: categoriaId, mes, monto: techo }, { onConflict: "categoria_id,mes" }),
        ),

      // Vale desde el mes elegido: si el ingreso venía de antes, se cierra y se abre uno nuevo.
      actualizarIngreso: (ingresoId, monto) => {
        const cambio = op.planCambioIngreso(datos, ingresoId, monto, mes, op.nuevoId());
        if (!cambio) return;
        ejecutar(
          (d) => op.aplicarCambioIngreso(d, cambio),
          async () => {
            if (cambio.tipo === "monto") return sb.from("ingresos").update({ monto: cambio.monto }).eq("id", cambio.id);
            const n = cambio.nuevo;
            const cerrar = await sb.from("ingresos").update({ hasta: cambio.cerrar.hasta }).eq("id", cambio.cerrar.id);
            if (cerrar.error) return cerrar;
            return sb.from("ingresos").insert({
              id: n.id,
              hogar_id: hogarId,
              miembro_id: n.miembroId,
              concepto: n.concepto,
              monto: n.monto,
              mes: null,
              desde: n.desde,
              hasta: n.hasta,
            });
          },
        );
      },

      actualizarPagoFijo: (pagoFijoId, cambios) =>
        ejecutar(
          (d) => op.actualizarPagoFijo(d, pagoFijoId, cambios),
          async () => {
            const { bajaDesde, altaDesde, tarjetaId, categoriaId, esDeuda, usdTotal, usdCuota, ...resto } = cambios;
            if (tarjetaId) await tarjetaGuardandose.current;
            return sb
              .from("pagos_fijos")
              .update({
                ...resto,
                ...(bajaDesde !== undefined ? { baja_desde: bajaDesde } : {}),
                ...(altaDesde !== undefined ? { alta_desde: altaDesde } : {}),
                ...(tarjetaId !== undefined ? { tarjeta_id: tarjetaId } : {}),
                ...(categoriaId !== undefined ? { categoria_id: categoriaId } : {}),
                ...(esDeuda !== undefined ? { es_deuda: esDeuda } : {}),
                ...(usdTotal !== undefined ? { usd_total: usdTotal } : {}),
                ...(usdCuota !== undefined ? { usd_cuota: usdCuota } : {}),
              })
              .eq("id", pagoFijoId);
          },
        ),

      renombrarCategoria: (categoriaId, nombre) =>
        ejecutar(
          (d) => op.renombrarCategoria(d, categoriaId, nombre),
          () => sb.from("categorias").update({ nombre: nombre.trim() }).eq("id", categoriaId),
        ),

      renombrarIngreso: (ingresoId, concepto) => {
        const ids = op.versionesIngreso(datos, ingresoId);
        ejecutar(
          (d) => op.renombrarIngreso(d, ingresoId, concepto),
          () => sb.from("ingresos").update({ concepto: concepto.trim() }).in("id", ids),
        );
      },

      agregarPagoFijo: (nuevo) => {
        const pf = op.armarPagoFijo(nuevo, mes);
        ejecutar(
          (d) => op.agregarPagoFijo(d, pf),
          async () => {
            await tarjetaGuardandose.current;
            return sb.from("pagos_fijos").insert({
              id: pf.id,
              hogar_id: hogarId,
              concepto: pf.concepto,
              categoria_id: pf.categoriaId,
              dia: pf.dia,
              monto: pf.monto,
              es_deuda: pf.esDeuda,
              activo: true,
              alta_desde: pf.altaDesde,
              cuotas: pf.cuotas,
              // Solo si hay: así anda aunque todavía no se haya corrido 0007_tarjetas.sql.
              ...(pf.tarjetaId ? { tarjeta_id: pf.tarjetaId } : {}),
              // Ídem con 0008_prestamos.sql.
              ...(pf.prestamo ? { prestamo: true, uva: !!pf.uva } : {}),
              // Ídem con 0009_dolares.sql.
              ...(pf.usdTotal && pf.usdCuota ? { usd_total: pf.usdTotal, usd_cuota: pf.usdCuota } : {}),
            });
          },
        );
      },

      agregarTarjeta: (nueva) => {
        const t = op.armarTarjeta(nueva);
        ejecutar(
          (d) => op.agregarTarjeta(d, t),
          () => {
            const guardado = sb
              .from("tarjetas")
              .insert({
                id: t.id,
                hogar_id: hogarId,
                banco: t.banco,
                ultimos4: t.ultimos4,
                miembro_id: t.miembroId,
                // Solo si hay: así anda aunque todavía no se haya corrido 0010_color_tarjetas.sql.
                ...(t.color ? { color: t.color } : {}),
              })
              .then((r) => r);
            tarjetaGuardandose.current = guardado;
            return guardado;
          },
        );
        return t.id;
      },

      actualizarTarjeta: (tarjetaId, cambios) =>
        ejecutar(
          (d) => op.actualizarTarjeta(d, tarjetaId, cambios),
          () => {
            const { miembroId, ...resto } = cambios;
            return sb
              .from("tarjetas")
              .update({
                ...(resto.banco !== undefined ? { banco: resto.banco.trim() } : {}),
                ...(resto.ultimos4 !== undefined ? { ultimos4: resto.ultimos4.trim() } : {}),
                ...(miembroId !== undefined ? { miembro_id: miembroId } : {}),
                ...(resto.color !== undefined ? { color: resto.color } : {}),
              })
              .eq("id", tarjetaId);
          },
        ),

      // Las compras quedan sin tarjeta: la base lo hace sola (on delete set null).
      borrarTarjeta: (tarjetaId) =>
        ejecutar(
          (d) => op.borrarTarjeta(d, tarjetaId),
          () => sb.from("tarjetas").delete().eq("id", tarjetaId),
        ),

      // Reemplaza todo lo del hogar. Si falla, no se borra nada (es una sola transacción).
      importarDatos: async (nuevos) => {
        const preparados = prepararImportacion(nuevos, datos.miembros, mesDe(hoy()));
        const { error } = await sb.rpc("importar_datos", { p_hogar: hogarId, p_datos: preparados });
        if (error) throw new Error("No se pudo importar el archivo. No se cambió nada.");
        await recargar();
      },

      guardarFoto: (miembroId, foto) =>
        ejecutar(
          (d) => op.cambiarFoto(d, miembroId, foto),
          () => sb.rpc("guardar_foto", { p_miembro: miembroId, p_foto: foto }),
        ),

      cerrarSesion: () => sb.auth.signOut(),
    };
  }, [datos, miembro.id, email, mes, sb, hogarId, ejecutar, recargar, privacidad.ocultos, privacidad.alternar]);

  if (!valor) {
    return error ? <PantallaCentrada>{error}</PantallaCentrada> : <PantallaCargando />;
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
