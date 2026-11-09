"use client";

// Tema de la app: sigue al celular ("auto") o queda fijo en claro u oscuro.
// Es una preferencia de este navegador, por eso vive en localStorage.

import { useEffect, useState } from "react";

export type Tema = "auto" | "claro" | "oscuro";

const CLAVE = "billetera-hogar:tema";
const FONDO = { claro: "#f7f4ed", oscuro: "#0c0a09" };

/** Se ejecuta antes de pintar (en <head>) para que no parpadee el tema equivocado. */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem("${CLAVE}");if(t==="claro"||t==="oscuro")document.documentElement.dataset.tema=t}catch(e){}`;

function aplicar(tema: Tema) {
  const raiz = document.documentElement;
  if (tema === "auto") delete raiz.dataset.tema;
  else raiz.dataset.tema = tema;
  const oscuro = tema === "oscuro" || (tema === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", oscuro ? FONDO.oscuro : FONDO.claro));
}

export function useTema(): [Tema, (t: Tema) => void] {
  const [tema, setTemaState] = useState<Tema>("auto");

  useEffect(() => {
    let guardado: Tema = "auto";
    try {
      const t = localStorage.getItem(CLAVE);
      if (t === "claro" || t === "oscuro") guardado = t;
    } catch {}
    setTemaState(guardado);
  }, []);

  const setTema = (t: Tema) => {
    setTemaState(t);
    try {
      if (t === "auto") localStorage.removeItem(CLAVE);
      else localStorage.setItem(CLAVE, t);
    } catch {}
    aplicar(t);
  };

  return [tema, setTema];
}
