import { describe, expect, it } from "vitest";
import { diasEntre, dolares, fijarMontosOcultos, montoATexto, montoEnVivo, pesosCortos } from "./formato";

describe("pesosCortos", () => {
  it("abrevia en mil y millones para que entre en una barra", () => {
    expect(pesosCortos(950)).toBe("$950");
    expect(pesosCortos(150000)).toBe("$150 mil");
    expect(pesosCortos(999_600)).toBe("$1 M");
    expect(pesosCortos(1_250_000)).toBe("$1,3 M");
    expect(pesosCortos(12_400_000)).toBe("$12 M");
  });
  it("respeta el ojito", () => {
    fijarMontosOcultos(true);
    expect(pesosCortos(150000)).toBe("$***");
    fijarMontosOcultos(false);
  });
});

describe("montoEnVivo", () => {
  it("pone puntos de miles mientras se escribe", () => {
    expect(montoEnVivo("5")).toEqual({ texto: "5", valor: 5 });
    expect(montoEnVivo("5000")).toEqual({ texto: "5.000", valor: 5000 });
    expect(montoEnVivo("5.0000")).toEqual({ texto: "50.000", valor: 50000 });
    expect(montoEnVivo("5000000,32").texto).toBe("5.000.000,32");
  });
  it("acepta coma o punto recién tecleado como decimal, con dos decimales como mucho", () => {
    expect(montoEnVivo("1.234,", "1.234").texto).toBe("1.234,");
    expect(montoEnVivo("1.234.", "1.234").texto).toBe("1.234,");
    expect(montoEnVivo("1.234,567").texto).toBe("1.234,56");
    expect(montoEnVivo("1.234,5").valor).toBe(1234.5);
    expect(montoEnVivo(",5").texto).toBe("0,5");
  });
  it("borrar deja el campo vacío", () => {
    expect(montoEnVivo("")).toEqual({ texto: "", valor: 0 });
  });
});

describe("montoATexto", () => {
  it("muestra decimales solo si los hay", () => {
    expect(montoATexto(1234567)).toBe("1.234.567");
    expect(montoATexto(222137.44)).toBe("222.137,44");
    expect(montoATexto(0)).toBe("");
  });
});

describe("diasEntre", () => {
  it("cuenta días entre fechas, cruzando meses", () => {
    expect(diasEntre("2026-11-06", "2026-11-10")).toBe(4);
    expect(diasEntre("2026-11-06", "2026-11-01")).toBe(-5);
    expect(diasEntre("2026-10-30", "2026-11-02")).toBe(3);
  });
});

describe("dolares", () => {
  it("con puntos de miles y centavos solo si los hay", () => {
    expect(dolares(6000)).toBe("US$ 6.000");
    expect(dolares(412.5)).toBe("US$ 412,50");
  });

  it("respeta el ojito", () => {
    fijarMontosOcultos(true);
    expect(dolares(6000)).toBe("US$***");
    fijarMontosOcultos(false);
  });
});
