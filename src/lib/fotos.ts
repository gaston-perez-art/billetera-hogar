"use client";

// Fotos de perfil de cada miembro. Se achican a 256 px y se guardan con los datos del hogar
// (en modo nube, en la fila del miembro en Supabase: las ven los dos celulares). Nunca van al repo.
//
// Antes se guardaban solo en el navegador (localStorage). Esas fotos viejas se siguen mostrando
// mientras el miembro no tenga una en la nube, y el modo nube las sube una vez (`fotosLocales`).

import { useBilletera } from "./contexto";

const CLAVE = "billetera-hogar:fotos";
type Fotos = Record<string, string>;

/** Fotos que quedaron guardadas solo en este navegador (versión anterior). */
export function fotosLocales(): Fotos {
  try {
    const crudo = localStorage.getItem(CLAVE);
    const valor = crudo ? JSON.parse(crudo) : {};
    return valor && typeof valor === "object" ? (valor as Fotos) : {};
  } catch {
    return {};
  }
}

/** Saca del navegador la foto vieja de un miembro (ya está en la nube). */
export function olvidarFotoLocal(miembroId: string) {
  try {
    const fotos = fotosLocales();
    delete fotos[miembroId];
    localStorage.setItem(CLAVE, JSON.stringify(fotos));
  } catch {
    // Sin storage: no hay nada que olvidar.
  }
}

/** Recorta al centro en cuadrado, achica a 256 px y devuelve un JPEG en data URL (unos 20-40 KB). */
export async function prepararFoto(archivo: File): Promise<string> {
  if (!archivo.type.startsWith("image/")) throw new Error("El archivo no es una imagen.");
  const bitmap = await createImageBitmap(archivo);
  const lado = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(bitmap, (bitmap.width - lado) / 2, (bitmap.height - lado) / 2, lado, lado, 0, 0, 256, 256);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

/** La foto de cada miembro: la del hogar, o la vieja de este navegador si todavía no subió. */
export function useFotos() {
  const { datos, guardarFoto } = useBilletera();
  const locales = typeof window === "undefined" ? {} : fotosLocales();
  const fotos: Fotos = {};
  for (const m of datos.miembros) {
    const foto = m.foto || locales[m.id];
    if (foto) fotos[m.id] = foto;
  }
  return { fotos, setFoto: guardarFoto };
}
