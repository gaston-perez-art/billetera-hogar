import { describe, expect, it } from "vitest";
import { leerDolarBlue } from "./dolar";

describe("leerDolarBlue", () => {
  it("toma la venta de la respuesta de dolarapi.com", () => {
    expect(leerDolarBlue({ moneda: "USD", casa: "blue", nombre: "Blue", compra: 1405, venta: 1425, fechaActualizacion: "2026-11-08T15:00:00.000Z" })).toEqual({
      venta: 1425,
      compra: 1405,
      fecha: "2026-11-08T15:00:00.000Z",
    });
  });

  it("devuelve null si la respuesta no sirve", () => {
    expect(leerDolarBlue(null)).toBeNull();
    expect(leerDolarBlue({ venta: "1425" })).toBeNull();
    expect(leerDolarBlue({ venta: 0 })).toBeNull();
  });
});
