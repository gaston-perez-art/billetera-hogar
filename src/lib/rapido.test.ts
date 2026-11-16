import { describe, expect, it } from "vitest";
import { leerCargaRapida } from "./rapido";
import type { Categoria } from "./tipos";

const cat = (id: string, nombre: string): Categoria => ({ id, nombre, orden: 0, techo: 0 });
const CATS = [
  cat("super", "Súper y comida"),
  cat("nafta", "Nafta y transporte"),
  cat("casa", "Casa y servicios"),
  cat("santino", "Santino"),
  cat("entre", "Entrenamientos"),
  cat("uberd", "Uber Driver"),
  cat("delivery", "Delivery"),
];
const leer = (t: string) => leerCargaRapida(t, CATS);

describe("carga rápida desde Siri", () => {
  it("monto y categoría de una frase simple", () => {
    expect(leer("Gasté 5000 en súper")).toEqual({ monto: 5000, categoriaId: "super", detalle: "", entra: false });
  });

  it("entiende miles dichos de distintas formas", () => {
    expect(leer("gasté 5.000 en súper").monto).toBe(5000);
    expect(leer("12 mil de nafta").monto).toBe(12000);
    expect(leer("5 lucas en el super").monto).toBe(5000);
    expect(leer("2,5 mil en verdulería").monto).toBe(2500);
    expect(leer("15k delivery").monto).toBe(15000);
    expect(leer("$ 1.234.567 casa").monto).toBe(1234567);
  });

  it("usa sinónimos para la categoría y deja el resto como detalle", () => {
    const r = leer("pagué 12 mil de nafta en la shell de libertador");
    expect(r.categoriaId).toBe("nafta");
    expect(r.detalle).toBe("Libertador");
    expect(leer("40 mil verdulería y carnicería").categoriaId).toBe("super");
    expect(leer("rappi 18000").categoriaId).toBe("delivery");
  });

  it("detalle libre cuando no hay categoría: Cargar la pregunta", () => {
    const r = leer("gasté 3000 en un regalo para Caro");
    expect(r.categoriaId).toBeNull();
    expect(r.monto).toBe(3000);
    expect(r.detalle).toBe("Regalo para Caro");
  });

  it("plata que entra", () => {
    const r = leer("cobré 27900 de uber driver");
    expect(r).toMatchObject({ monto: 27900, categoriaId: "uberd", entra: true });
  });

  it("categoría por el comienzo de la palabra", () => {
    expect(leer("8000 entrenamiento").categoriaId).toBe("entre");
    expect(leer("santino 3500 útiles").detalle).toBe("Útiles");
  });

  it("sin número no inventa un monto", () => {
    expect(leer("súper").monto).toBe(0);
  });

  it("números con palabras, como los escribe Siri", () => {
    expect(leer("Gasté cinco lucas en el mercado")).toEqual({ monto: 5000, categoriaId: "super", detalle: "", entra: false });
    expect(leer("dos mil quinientos de nafta").monto).toBe(2500);
    expect(leer("veinticinco mil en delivery").monto).toBe(25000);
    expect(leer("ciento veinte mil casa").monto).toBe(120000);
    expect(leer("quince mil cuatrocientos súper").monto).toBe(15400);
    expect(leer("treinta y cinco mil súper").monto).toBe(35000);
    expect(leer("una luca de verdulería").monto).toBe(1000);
    expect(leer("un millón doscientos mil casa").monto).toBe(1200000);
    expect(leer("cobré cincuenta mil de uber driver")).toMatchObject({ monto: 50000, categoriaId: "uberd", entra: true });
  });

  it("\"un\" suelto no es un número", () => {
    const r = leer("tres mil en un regalo");
    expect(r.monto).toBe(3000);
    expect(r.detalle).toBe("Regalo");
  });
});
