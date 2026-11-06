"use client";

// Fotos de perfil de cada miembro. Se achican a 256 px y se guardan solo en este
// navegador (localStorage): nunca van al repo, que es público.

import { useCallback, useEffect, useState } from "react";

const CLAVE = "billetera-hogar:fotos";
const EVENTO = "billetera-hogar:fotos-cambiaron";
type Fotos = Record<string, string>;

function leer(): Fotos {
  try {
    const crudo = localStorage.getItem(CLAVE);
    const valor = crudo ? JSON.parse(crudo) : {};
    return valor && typeof valor === "object" ? (valor as Fotos) : {};
  } catch {
    return {};
  }
}

/** Recorta al centro en cuadrado, achica a 256 px y devuelve un JPEG en data URL. */
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
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function useFotos() {
  const [fotos, setFotos] = useState<Fotos>({});

  useEffect(() => {
    setFotos(leer());
    const actualizar = () => setFotos(leer());
    window.addEventListener(EVENTO, actualizar);
    return () => window.removeEventListener(EVENTO, actualizar);
  }, []);

  const setFoto = useCallback((miembroId: string, dataUrl: string | null) => {
    const nuevas = { ...leer() };
    if (dataUrl) nuevas[miembroId] = dataUrl;
    else delete nuevas[miembroId];
    try {
      localStorage.setItem(CLAVE, JSON.stringify(nuevas));
    } catch {
      throw new Error("No hay espacio en el navegador para guardar la foto.");
    }
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  return { fotos, setFoto };
}
