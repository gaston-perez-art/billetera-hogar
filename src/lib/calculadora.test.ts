import { describe, expect, it } from "vitest";
import { desdeMonto, evaluar, mostrar, operar, teclear, type Tecla } from "./calculadora";

const escribir = (teclas: string) => [...teclas].reduce((t, k) => teclear(t, k as Tecla), [] as string[]);

describe("teclado de Cargar", () => {
  it("escribe un monto como siempre", () => {
    const t = escribir("29000");
    expect(mostrar(t)).toBe("29.000");
    expect(evaluar(t)).toBe(29_000);
  });

  it("suma en la misma línea, sin tocar el campo de nuevo", () => {
    const t = escribir("29000+14000");
    expect(mostrar(t)).toBe("29.000 + 14.000");
    expect(evaluar(t)).toBe(43_000);
  });

  it("× y ÷ van antes que + y −, como en cualquier calculadora", () => {
    expect(evaluar(escribir("1000+2000×3"))).toBe(7_000);
    expect(evaluar(escribir("9000−3000÷3"))).toBe(8_000);
  });

  it("un operador al final no cuenta y tocar otro lo reemplaza", () => {
    expect(evaluar(escribir("5000+"))).toBe(5_000);
    expect(mostrar(escribir("5000+−"))).toBe("5.000 −");
  });

  it("no arranca con un operador", () => {
    expect(escribir("+5")).toEqual(["5"]);
  });

  it("decimales: una coma y hasta dos cifras", () => {
    expect(mostrar(escribir("1500,505"))).toBe("1.500,50");
    expect(mostrar(escribir(",5"))).toBe("0,5");
    expect(escribir("1,,5")).toEqual(["1,5"]);
  });

  it("borrar saca de a un carácter, operadores incluidos", () => {
    expect(escribir("12+3⌫⌫")).toEqual(["12"]);
    expect(escribir("1⌫⌫")).toEqual([]);
  });

  it("dividir por cero no rompe: queda lo que había", () => {
    expect(operar(10_000, "÷", 0)).toBe(10_000);
    expect(evaluar(escribir("10000÷0"))).toBe(10_000);
  });

  it("volver al paso del monto muestra el resultado", () => {
    expect(desdeMonto(43_000)).toEqual(["43000"]);
    expect(desdeMonto(1500.5)).toEqual(["1500,5"]);
    expect(desdeMonto(0)).toEqual([]);
  });
});
