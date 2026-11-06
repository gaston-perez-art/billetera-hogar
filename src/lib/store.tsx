"use client";

// Capa de datos. Las pantallas solo usan `useBilletera()` y no saben dónde viven los datos:
// - Modo nube (Supabase configurado): login, base compartida y cambios en vivo entre celulares.
// - Modo demo (sin variables de Supabase): datos ficticios en el navegador.

import { supabase } from "./supabase";
import { ProveedorLocal } from "./store-local";
import { ProveedorNube } from "./store-nube";

export { useBilletera, type Billetera } from "./contexto";
export type { NuevoMovimiento } from "./operaciones";

export function ProveedorBilletera({ children }: { children: React.ReactNode }) {
  return supabase ? (
    <ProveedorNube sb={supabase}>{children}</ProveedorNube>
  ) : (
    <ProveedorLocal>{children}</ProveedorLocal>
  );
}
