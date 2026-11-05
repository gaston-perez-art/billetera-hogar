"use client";

// Capa de datos del POC: todo vive en localStorage del navegador.
// Al pasar a Supabase, este archivo es el único que cambia (mismas acciones,
// implementadas con el cliente de Supabase + Realtime).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { datosDemo } from "./demo";
import { fechaEnMes, hoy, mesDe } from "./formato";
import type { Datos, Mes, Movimiento } from "./tipos";

const CLAVE_DATOS = "billetera-hogar:datos:v1";
const CLAVE_USUARIO = "billetera-hogar:usuario";

function nuevoId(prefijo: string) {
  return `${prefijo}-${crypto.randomUUID()}`;
}

function leer<T>(clave: string): T | null {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : null;
  } catch {
    return null;
  }
}

function guardar(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, typeof valor === "string" ? valor : JSON.stringify(valor));
  } catch {
    // Sin storage (modo privado): la app sigue andando en memoria.
  }
}

export type NuevoMovimiento = Omit<Movimiento, "id" | "creadoEn">;

interface Billetera {
  datos: Datos;
  usuarioId: string;
  setUsuarioId: (id: string) => void;
  mes: Mes;
  setMes: (mes: Mes) => void;
  agregarMovimiento: (m: NuevoMovimiento) => void;
  borrarMovimiento: (id: string) => void;
  marcarPagado: (pagoFijoId: string, mes: Mes) => void;
  desmarcarPagado: (pagoFijoId: string, mes: Mes) => void;
  actualizarTecho: (categoriaId: string, techo: number) => void;
  actualizarIngreso: (ingresoId: string, monto: number) => void;
  actualizarPagoFijo: (pagoFijoId: string, cambios: { monto?: number; dia?: number; activo?: boolean }) => void;
  reiniciarDemo: () => void;
}

const Contexto = createContext<Billetera | null>(null);

export function useBilletera() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useBilletera fuera de <ProveedorBilletera>");
  return ctx;
}

export function ProveedorBilletera({ children }: { children: React.ReactNode }) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [usuarioId, setUsuarioIdState] = useState("gaston");
  const [mes, setMes] = useState<Mes>(() => mesDe(hoy()));

  useEffect(() => {
    const guardados = leer<Datos>(CLAVE_DATOS);
    const inicial = guardados ?? datosDemo();
    if (!guardados) guardar(CLAVE_DATOS, inicial);
    setDatos(inicial);
    const usuario = leer<string>(CLAVE_USUARIO);
    if (usuario && inicial.miembros.some((m) => m.id === usuario)) setUsuarioIdState(usuario);
  }, []);

  // Sincroniza entre pestañas: un anticipo de lo que hará Realtime con dos celulares.
  useEffect(() => {
    const alCambiar = (e: StorageEvent) => {
      if (e.key === CLAVE_DATOS && e.newValue) setDatos(JSON.parse(e.newValue));
    };
    window.addEventListener("storage", alCambiar);
    return () => window.removeEventListener("storage", alCambiar);
  }, []);

  const cambiar = useCallback((fn: (d: Datos) => Datos) => {
    setDatos((prev) => {
      if (!prev) return prev;
      const siguiente = fn(prev);
      guardar(CLAVE_DATOS, siguiente);
      return siguiente;
    });
  }, []);

  const valor = useMemo<Billetera | null>(() => {
    if (!datos) return null;
    return {
      datos,
      usuarioId,
      setUsuarioId: (id) => {
        setUsuarioIdState(id);
        guardar(CLAVE_USUARIO, JSON.stringify(id));
      },
      mes,
      setMes,

      agregarMovimiento: (m) =>
        cambiar((d) => ({
          ...d,
          movimientos: [...d.movimientos, { ...m, id: nuevoId("mov"), creadoEn: new Date().toISOString() }],
        })),

      // Si el gasto venía de un pago fijo, el pago vuelve a quedar pendiente.
      borrarMovimiento: (id) =>
        cambiar((d) => ({
          ...d,
          movimientos: d.movimientos.filter((m) => m.id !== id),
          pagosMes: d.pagosMes.map((p) => (p.movimientoId === id ? { ...p, pagado: false, movimientoId: undefined } : p)),
        })),

      // Regla clave: marcar pagado CREA el gasto (en la planilla se olvidaba cargarlo).
      marcarPagado: (pagoFijoId, mesPago) =>
        cambiar((d) => {
          const pf = d.pagosFijos.find((p) => p.id === pagoFijoId);
          if (!pf) return d;
          const existente = d.pagosMes.find((p) => p.pagoFijoId === pagoFijoId && p.mes === mesPago);
          if (existente?.pagado) return d;
          const monto = existente?.monto ?? pf.monto;
          const fechaHoy = hoy();
          const fecha = mesDe(fechaHoy) === mesPago ? fechaHoy : fechaEnMes(mesPago, pf.dia);
          const movimiento: Movimiento = {
            id: nuevoId("mov"),
            fecha,
            monto,
            categoriaId: pf.categoriaId,
            detalle: pf.concepto,
            pagoPor: usuarioId,
            creadoEn: new Date().toISOString(),
          };
          const registro = {
            id: existente?.id ?? nuevoId("pm"),
            pagoFijoId,
            mes: mesPago,
            monto,
            pagado: true,
            movimientoId: movimiento.id,
          };
          return {
            ...d,
            movimientos: [...d.movimientos, movimiento],
            pagosMes: existente
              ? d.pagosMes.map((p) => (p.id === existente.id ? registro : p))
              : [...d.pagosMes, registro],
          };
        }),

      desmarcarPagado: (pagoFijoId, mesPago) =>
        cambiar((d) => {
          const registro = d.pagosMes.find((p) => p.pagoFijoId === pagoFijoId && p.mes === mesPago);
          if (!registro?.pagado) return d;
          return {
            ...d,
            movimientos: d.movimientos.filter((m) => m.id !== registro.movimientoId),
            pagosMes: d.pagosMes.map((p) =>
              p.id === registro.id ? { ...p, pagado: false, movimientoId: undefined } : p,
            ),
          };
        }),

      actualizarTecho: (categoriaId, techo) =>
        cambiar((d) => ({
          ...d,
          categorias: d.categorias.map((c) => (c.id === categoriaId ? { ...c, techo } : c)),
        })),

      actualizarIngreso: (ingresoId, monto) =>
        cambiar((d) => ({
          ...d,
          ingresos: d.ingresos.map((i) => (i.id === ingresoId ? { ...i, monto } : i)),
        })),

      actualizarPagoFijo: (pagoFijoId, cambios) =>
        cambiar((d) => ({
          ...d,
          pagosFijos: d.pagosFijos.map((p) => (p.id === pagoFijoId ? { ...p, ...cambios } : p)),
        })),

      reiniciarDemo: () => cambiar(() => datosDemo()),
    };
  }, [datos, usuarioId, mes, cambiar]);

  if (!valor) {
    return <div className="min-h-dvh grid place-items-center text-sm text-tenue">Cargando…</div>;
  }
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
