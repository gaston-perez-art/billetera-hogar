import { describe, expect, it } from "vitest";
import { csvParaPlanilla, gastosEntre } from "./exportar";
import type { Datos } from "./tipos";

const datos: Datos = {
  miembros: [
    { id: "g", nombre: "Gastón" },
    { id: "j", nombre: "Jime" },
  ],
  categorias: [{ id: "c1", nombre: "Súper y comida", orden: 1, techo: 0 }],
  ingresos: [],
  pagosFijos: [],
  pagosMes: [],
  movimientos: [
    { id: "2", fecha: "2026-11-05", monto: 1500.5, categoriaId: "c1", detalle: 'Coto, "oferta"', medio: "MP saldo", pagoPor: "j", creadoEn: "2026-11-05T10:00:00Z" },
    { id: "1", fecha: "2026-11-01", monto: 30800, categoriaId: "c1", detalle: "", medio: "Galicia", pagoPor: "g", creadoEn: "2026-11-01T10:00:00Z" },
    { id: "3", fecha: "2026-10-31", monto: 99, categoriaId: "c1", detalle: "", pagoPor: "g", creadoEn: "2026-10-31T10:00:00Z" },
  ],
};

describe("exportar para la planilla", () => {
  it("toma solo el período, con los dos extremos, ordenado por fecha", () => {
    expect(gastosEntre(datos, "2026-11-01", "2026-11-05").map((m) => m.id)).toEqual(["1", "2"]);
  });
  it("mismas columnas que Base de datos, fecha DD/MM/AAAA y nombres en vez de ids", () => {
    const csv = csvParaPlanilla(datos, "2026-11-01", "2026-11-30").split("\r\n");
    expect(csv[0]).toBe("Fecha,Monto,Categoría,Detalle,Medio de pago,Pagó");
    expect(csv[1]).toBe("01/11/2026,30800,Súper y comida,,Galicia,Gastón");
    expect(csv[2]).toBe('05/11/2026,1500.5,Súper y comida,"Coto, ""oferta""",MP saldo,Jime');
  });
});
