import { describe, expect, it } from "vitest";
import { operar } from "./calculadora";

describe("calculadora de Cargar", () => {
  it("suma, resta, multiplica y divide", () => {
    expect(operar(29_000, "+", 14_000)).toBe(43_000);
    expect(operar(43_000, "−", 3_000)).toBe(40_000);
    expect(operar(1_500, "×", 3)).toBe(4_500);
    expect(operar(10_000, "÷", 3)).toBe(3_333.33);
  });

  it("dividir por cero no rompe: queda lo que había", () => {
    expect(operar(10_000, "÷", 0)).toBe(10_000);
  });
});
