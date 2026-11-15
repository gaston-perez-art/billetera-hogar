// Calculadora básica de Cargar: para sumar varios tickets de la misma categoría sin salir de la app.

export type Operador = "+" | "−" | "×" | "÷";

export const OPERADORES: Operador[] = ["+", "−", "×", "÷"];

/** a (op) b, redondeado a centavos. Dividir por cero deja `a` como estaba. */
export function operar(a: number, op: Operador, b: number): number {
  const r = op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : b === 0 ? a : a / b;
  return Math.round(r * 100) / 100;
}
