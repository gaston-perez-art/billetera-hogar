"use client";

import { createContext, useContext } from "react";
import type { CambiosPagoFijo, NuevoMovimiento } from "./operaciones";
import type { Datos, Mes } from "./tipos";

export interface Billetera {
  modo: "demo" | "nube";
  datos: Datos;
  /** Miembro que usa la app. En modo nube es el de la cuenta con la que se entró. */
  usuarioId: string;
  /** Solo en modo demo: cambiar quién usa la app sin login. */
  setUsuarioId?: (id: string) => void;
  mes: Mes;
  setMes: (mes: Mes) => void;
  agregarMovimiento: (m: NuevoMovimiento) => void;
  borrarMovimiento: (id: string) => void;
  marcarPagado: (pagoFijoId: string, mes: Mes) => void;
  desmarcarPagado: (pagoFijoId: string, mes: Mes) => void;
  /** Crea una categoría para los dos y devuelve su id (para elegirla al toque). */
  agregarCategoria: (nombre: string) => string;
  /** En modo nube vale desde el mes elegido en adelante. */
  actualizarTecho: (categoriaId: string, techo: number) => void;
  /** Vale desde el mes elegido: los meses anteriores no cambian. */
  actualizarIngreso: (ingresoId: string, monto: number) => void;
  actualizarPagoFijo: (pagoFijoId: string, cambios: CambiosPagoFijo) => void;
  importarDatos: (d: Datos) => Promise<void>;
  reiniciarDemo?: () => void;
  cerrarSesion?: () => void;
  /** El ojito: montos ocultos en este celular. */
  montosOcultos: boolean;
  alternarMontosOcultos: () => void;
  /** Email de la cuenta (modo nube). */
  email?: string;
}

export const ContextoBilletera = createContext<Billetera | null>(null);

export function useBilletera() {
  const ctx = useContext(ContextoBilletera);
  if (!ctx) throw new Error("useBilletera fuera de <ProveedorBilletera>");
  return ctx;
}

export function PantallaCentrada({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-dvh place-items-center px-6 text-center text-sm text-tenue">{children}</div>;
}
