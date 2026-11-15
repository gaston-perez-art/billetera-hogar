// Teclado de Cargar: números y cuentas básicas en una sola línea, como una calculadora.
// La cuenta se guarda como términos: números escritos ("29000", "1500,5") y operadores.

export type Operador = "+" | "−" | "×" | "÷";
export type Tecla = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "," | "⌫" | Operador;

export const OPERADORES: Operador[] = ["÷", "×", "−", "+"];
const esOperador = (s: string | undefined): s is Operador => !!s && (OPERADORES as string[]).includes(s);
const MAX_CIFRAS = 11;

/** La cuenta después de tocar una tecla. */
export function teclear(terminos: string[], tecla: Tecla): string[] {
  const t = [...terminos];
  const ultimo = t[t.length - 1];
  if (tecla === "⌫") {
    if (!ultimo) return t;
    const recortado = esOperador(ultimo) ? "" : ultimo.slice(0, -1);
    if (recortado) t[t.length - 1] = recortado;
    else t.pop();
    return t;
  }
  if (esOperador(tecla)) {
    if (!ultimo) return t; // Sin número no hay cuenta.
    if (esOperador(ultimo)) t[t.length - 1] = tecla;
    else t.push(tecla);
    return t;
  }
  const numero = ultimo && !esOperador(ultimo) ? ultimo : "";
  let nuevo: string;
  if (tecla === ",") {
    if (numero.includes(",")) return t;
    nuevo = (numero || "0") + ",";
  } else {
    const [entera, dec] = numero.split(",");
    if (dec !== undefined && dec.length >= 2) return t;
    if (dec === undefined && entera.length >= MAX_CIFRAS) return t;
    nuevo = numero === "0" ? tecla : numero + tecla;
  }
  if (numero) t[t.length - 1] = nuevo;
  else t.push(nuevo);
  return t;
}

const valor = (n: string) => Number(n.replace(",", "."));

/** a (op) b, redondeado a centavos. Dividir por cero deja `a` como estaba. */
export function operar(a: number, op: Operador, b: number): number {
  const r = op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : b === 0 ? a : a / b;
  return Math.round(r * 100) / 100;
}

/** Resultado de la cuenta: × y ÷ antes que + y −, como cualquier calculadora. Un operador al final no cuenta. */
export function evaluar(terminos: string[]): number {
  const t = esOperador(terminos[terminos.length - 1]) ? terminos.slice(0, -1) : terminos;
  if (t.length === 0) return 0;
  // Primero × y ÷.
  const sumandos: (number | Operador)[] = [valor(t[0])];
  for (let i = 1; i < t.length; i += 2) {
    const op = t[i] as Operador;
    const n = valor(t[i + 1]);
    if (op === "×" || op === "÷") sumandos[sumandos.length - 1] = operar(sumandos[sumandos.length - 1] as number, op, n);
    else sumandos.push(op, n);
  }
  let r = sumandos[0] as number;
  for (let i = 1; i < sumandos.length; i += 2) r = operar(r, sumandos[i] as Operador, sumandos[i + 1] as number);
  return Math.round(r * 100) / 100;
}

const miles = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** Un número escrito, con puntos de miles: "29000,5" → "29.000,5". */
export function mostrarNumero(n: string): string {
  const [entera, dec] = n.split(",");
  return miles.format(Number(entera || "0")) + (dec !== undefined ? `,${dec}` : "");
}

/** La cuenta en una línea: "29.000 + 14.000". */
export function mostrar(terminos: string[]): string {
  return terminos.map((x) => (esOperador(x) ? x : mostrarNumero(x))).join(" ");
}

export function tieneOperador(terminos: string[]): boolean {
  return terminos.some(esOperador);
}

/** Un monto como cuenta de un solo término (para volver al paso del monto). */
export function desdeMonto(monto: number): string[] {
  if (!monto) return [];
  const [entera, dec] = monto.toFixed(2).split(".");
  return [dec === "00" ? entera : `${entera},${dec.replace(/0$/, "")}`];
}
