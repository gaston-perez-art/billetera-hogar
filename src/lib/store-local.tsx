"use client";

// Modo demo: todo vive en localStorage del navegador, con datos ficticios.

import { useCallback, useEffect, useMemo, useState } from "react";
import { ContextoBilletera, PantallaCentrada, type Billetera } from "./contexto";
import { datosDemo } from "./demo";
import { hoy, mesDe } from "./formato";
import * as op from "./operaciones";
import { useMontosOcultos } from "./privacidad";
import type { Datos, Mes } from "./tipos";

const CLAVE_DATOS = "billetera-hogar:datos:v1";
const CLAVE_USUARIO = "billetera-hogar:usuario";

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

export function ProveedorLocal({ children }: { children: React.ReactNode }) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [usuarioId, setUsuarioIdState] = useState("gaston");
  const [mes, setMes] = useState<Mes>(() => mesDe(hoy()));
  const privacidad = useMontosOcultos();

  useEffect(() => {
    const guardados = leer<Datos>(CLAVE_DATOS);
    const inicial = guardados ?? datosDemo();
    if (!guardados) guardar(CLAVE_DATOS, inicial);
    setDatos(inicial);
    const usuario = leer<string>(CLAVE_USUARIO);
    if (usuario && inicial.miembros.some((m) => m.id === usuario)) setUsuarioIdState(usuario);
  }, []);

  // Sincroniza entre pestañas del mismo navegador.
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
      modo: "demo",
      montosOcultos: privacidad.ocultos,
      alternarMontosOcultos: privacidad.alternar,
      datos,
      usuarioId,
      setUsuarioId: (id) => {
        setUsuarioIdState(id);
        guardar(CLAVE_USUARIO, JSON.stringify(id));
      },
      mes,
      setMes,
      agregarMovimiento: (m) =>
        cambiar((d) => op.agregarMovimiento(d, { ...m, id: op.nuevoId(), creadoEn: new Date().toISOString() })),
      borrarMovimiento: (id) => cambiar((d) => op.borrarMovimiento(d, id)),
      marcarPagado: (pagoFijoId, mesPago) =>
        cambiar((d) => op.marcarPagado(d, pagoFijoId, mesPago, usuarioId, op.nuevoId())),
      desmarcarPagado: (pagoFijoId, mesPago) => cambiar((d) => op.desmarcarPagado(d, pagoFijoId, mesPago)),
      agregarCategoria: (nombre) => {
        const id = op.nuevoId();
        cambiar((d) => op.agregarCategoria(d, id, nombre));
        return id;
      },
      actualizarTecho: (categoriaId, techo) => cambiar((d) => op.actualizarTecho(d, categoriaId, techo)),
      actualizarIngreso: (ingresoId, monto) =>
        cambiar((d) => op.aplicarCambioIngreso(d, op.planCambioIngreso(d, ingresoId, monto, mes, op.nuevoId()))),
      actualizarPagoFijo: (pagoFijoId, cambios) => cambiar((d) => op.actualizarPagoFijo(d, pagoFijoId, cambios)),
      guardarFoto: (miembroId, foto) => cambiar((d) => op.cambiarFoto(d, miembroId, foto)),
      reiniciarDemo: () => cambiar(() => datosDemo()),
      importarDatos: async (nuevos) => {
        cambiar(() => nuevos);
        if (!nuevos.miembros.some((m) => m.id === usuarioId)) setUsuarioIdState(nuevos.miembros[0].id);
      },
    };
  }, [datos, usuarioId, mes, cambiar, privacidad.ocultos, privacidad.alternar]);

  if (!valor) return <PantallaCentrada>Cargando…</PantallaCentrada>;
  return <ContextoBilletera.Provider value={valor}>{children}</ContextoBilletera.Provider>;
}
