// Carga rápida desde un Atajo del iPhone (Siri o un botón en la pantalla de inicio).
// El Atajo abre /cargar/?texto=<lo que dictaste>. Acá se entiende la frase: el monto, la
// categoría y lo que sobra como detalle. Si algo no se entiende, Cargar lo pregunta.

import type { Categoria } from "./tipos";

export interface CargaRapida {
  monto: number;
  categoriaId: string | null;
  detalle: string;
  /** "Cobré", "gané", "me pagaron": plata que entra. */
  entra: boolean;
}

/** Sin tildes, en minúscula y sin signos. */
export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.,$\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const VERBOS = new Set(["gaste", "pague", "compre", "puse", "saque", "cargar", "carga", "anota", "anotar", "gasto", "pago", "son", "fueron", "cobre", "gane", "entraron", "entro", "me", "pagaron", "recibi"]);
const ENTRA = /\b(cobre|gane|entraron|entro|me pagaron|recibi)\b/;
const RELLENO = new Set(["en", "de", "del", "la", "el", "los", "las", "un", "una", "por", "para", "con", "y", "al", "a", "que", "pesos", "peso", "mangos", "$"]);
/** Palabras que en la calle quieren decir mil. */
const MILES = new Set(["mil", "lucas", "luca", "k"]);

/** Atajos de palabra a categoría, para las que se dicen distinto de como se llaman. */
const SINONIMOS: Record<string, string[]> = {
  super: ["super", "supermercado", "mercado", "chino", "verduleria", "verdura", "verduras", "carniceria", "almacen", "comida"],
  nafta: ["nafta", "combustible", "ypf", "shell", "axion", "estacionamiento", "peaje", "sube", "colectivo", "tren"],
  delivery: ["delivery", "rappi", "pedidosya", "pedidos"],
  salud: ["farmacia", "remedios", "medico", "salud", "obra"],
  uber: ["uber", "cabify", "didi", "taxi", "remis"],
};

/** Lee el número de la frase: "5000", "5.000", "5 mil", "5 lucas", "2,5 mil", "5k". */
function leerMonto(palabras: string[]): { monto: number; usadas: Set<number> } {
  for (let i = 0; i < palabras.length; i++) {
    let p = palabras[i].replace(/^\$/, "");
    let multiplicador = 1;
    if (/^\d+([.,]\d+)*k$/.test(p)) {
      p = p.slice(0, -1);
      multiplicador = 1000;
    }
    if (!/^\d+([.,]\d+)*$/.test(p)) continue;
    const usadas = new Set([i]);
    if (MILES.has(palabras[i + 1] ?? "")) {
      multiplicador = 1000;
      usadas.add(i + 1);
    }
    // "5.000" o "1.234.567" son miles; "2,5" o "2.5" antes de "mil" son decimales.
    let valor: number;
    if (multiplicador === 1000) valor = Number(p.replace(",", "."));
    else if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(p)) valor = Number(p.replace(/\./g, "").replace(",", "."));
    else valor = Number(p.replace(",", "."));
    if (Number.isFinite(valor) && valor > 0) return { monto: Math.round(valor * multiplicador * 100) / 100, usadas };
  }
  return { monto: 0, usadas: new Set() };
}

/** Números dichos con palabras, como los escribe Siri al dictar: "cinco lucas", "dos mil quinientos". */
const UNIDADES: Record<string, number> = {
  cero: 0, uno: 1, un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18,
  diecinueve: 19, veinte: 20, veintiuno: 21, veintiun: 21, veintiuna: 21, veintidos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};
const MILLONES = new Set(["millon", "millones", "palo", "palos"]);

function leerMontoEnPalabras(palabras: string[]): { monto: number; usadas: Set<number> } {
  for (let i = 0; i < palabras.length; i++) {
    const p = palabras[i];
    // "un"/"una" solo cuentan si después viene "mil", "luca" o "millón" ("una luca"); si no, son relleno.
    const esUnidad = p in UNIDADES && (!["un", "una", "uno"].includes(p) || MILES.has(palabras[i + 1] ?? "") || MILLONES.has(palabras[i + 1] ?? ""));
    if (!esUnidad) continue;
    let total = 0;
    let actual = 0;
    const usadas = new Set<number>();
    let j = i;
    for (; j < palabras.length; j++) {
      const w = palabras[j];
      if (w in UNIDADES) actual += UNIDADES[w];
      else if (MILES.has(w)) {
        total += (actual || 1) * 1000;
        actual = 0;
      } else if (MILLONES.has(w)) {
        total = (total + (actual || 1)) * 1_000_000;
        actual = 0;
      } else if (w === "y" && palabras[j + 1] in UNIDADES) {
        // "treinta y cinco"
      } else break;
      usadas.add(j);
    }
    const monto = total + actual;
    if (monto > 0) return { monto, usadas };
  }
  return { monto: 0, usadas: new Set() };
}

/** La categoría que mejor encaja con las palabras, si alguna encaja. */
function elegirCategoria(palabras: string[], categorias: Categoria[]): { id: string | null; usadas: Set<number> } {
  let mejor: { id: string | null; puntaje: number; usadas: Set<number> } = { id: null, puntaje: 0, usadas: new Set() };
  for (const c of categorias) {
    const propias = normalizar(c.nombre).split(" ").filter((w) => w.length > 2 && !RELLENO.has(w));
    const clave = Object.keys(SINONIMOS).find((k) => propias.some((w) => w.startsWith(k)));
    const buscadas = [...propias, ...(clave ? SINONIMOS[clave] : [])];
    const usadas = new Set<number>();
    let puntaje = 0;
    palabras.forEach((p, i) => {
      if (p.length < 3) return;
      // Coincide entera o por el comienzo ("entrenamiento" con "entrenamientos").
      const coincide = buscadas.some((b) => b === p || (p.length >= 4 && (b.startsWith(p) || p.startsWith(b))));
      if (coincide) {
        usadas.add(i);
        puntaje += propias.includes(p) ? 2 : 1;
      }
    });
    if (puntaje > mejor.puntaje) mejor = { id: c.id, puntaje, usadas };
  }
  return { id: mejor.id, usadas: mejor.usadas };
}

/** Entiende "gasté 5 lucas en el súper" o "cobré 27900 de uber". */
export function leerCargaRapida(texto: string, categorias: Categoria[]): CargaRapida {
  const limpio = normalizar(texto);
  // Cada palabra, normalizada para entender y original para el detalle (con tildes y mayúsculas).
  const pares = texto
    .trim()
    .split(/\s+/)
    .map((o) => ({ o: o.replace(/[.,;:!?¡¿]+$/, ""), n: normalizar(o).replace(/[.,]+$/, "") }))
    .filter((x) => x.n);
  const palabras = pares.map((x) => x.n);
  const entra = ENTRA.test(limpio);
  // Primero con cifras ("5000", "5 lucas"); si no hay, con palabras ("cinco lucas").
  const conCifras = leerMonto(palabras);
  const { monto, usadas: delMonto } = conCifras.monto > 0 ? conCifras : leerMontoEnPalabras(palabras);
  const { id, usadas: deCategoria } = elegirCategoria(palabras.filter((_, i) => !delMonto.has(i)).length ? palabras : [], categorias);
  // Lo que sobra (sin el monto, la categoría, los verbos ni el relleno de las puntas) es el detalle.
  const resto = pares.filter((x, i) => !delMonto.has(i) && !deCategoria.has(i) && !VERBOS.has(x.n));
  while (resto.length && RELLENO.has(resto[0].n)) resto.shift();
  while (resto.length && RELLENO.has(resto[resto.length - 1].n)) resto.pop();
  const detalle = resto.map((x) => x.o).join(" ");
  return { monto, categoriaId: id, detalle: detalle ? detalle[0].toUpperCase() + detalle.slice(1) : "", entra };
}
