import { describe, expect, it } from "vitest";
import { datosDemo } from "./demo";
import { filasADatos, prepararImportacion, techoVigente, type Filas } from "./nube";
import * as op from "./operaciones";

const techos: Filas["techos"] = [
  { id: "1", categoria_id: "super", mes: "2026-08-01", monto: "500000.00" },
  { id: "2", categoria_id: "super", mes: "2026-10-01", monto: "650000.00" },
  { id: "3", categoria_id: "uber", mes: "2026-10-01", monto: 40000 },
];

describe("techoVigente", () => {
  it("usa el último techo cargado en ese mes o antes", () => {
    expect(techoVigente(techos, "super", "2026-09-01")).toBe(500000);
    expect(techoVigente(techos, "super", "2026-10-01")).toBe(650000);
    expect(techoVigente(techos, "super", "2027-01-01")).toBe(650000);
  });
  it("es 0 antes del primer techo o si la categoría no tiene", () => {
    expect(techoVigente(techos, "super", "2026-07-01")).toBe(0);
    expect(techoVigente(techos, "salud", "2026-10-01")).toBe(0);
  });
});

describe("filasADatos", () => {
  it("convierte montos numeric (texto) a número y nombres de columnas", () => {
    const d = filasADatos(
      {
        miembros: [{ id: "g", nombre: "Gastón", user_id: "u1" }],
        categorias: [{ id: "super", nombre: "Súper", orden: 0 }],
        techos,
        ingresos: [{ id: "i", miembro_id: "g", concepto: "Sueldo", monto: "1000.50", mes: null }],
        movimientos: [
          { id: "m", fecha: "2026-10-03", monto: "-200.00", categoria_id: "super", detalle: null, medio: null, pago_por: "g", created_at: "2026-10-03T12:00:00Z" },
        ],
        pagos_fijos: [{ id: "pf", concepto: "Luz", categoria_id: "super", dia: 5, monto: "100", es_deuda: false, activo: true }],
        pagos_mes: [{ id: "pm", pago_fijo_id: "pf", mes: "2026-10-01", monto: "100", pagado: false, movimiento_id: null }],
      },
      "2026-10-01",
    );
    expect(d.categorias[0].techo).toBe(650000);
    expect(d.ingresos[0]).toMatchObject({ miembroId: "g", monto: 1000.5, mes: null });
    expect(d.movimientos[0]).toMatchObject({ monto: -200, detalle: "", categoriaId: "super", pagoPor: "g" });
    expect(d.pagosMes[0].movimientoId).toBeUndefined();
  });

  it("lee un préstamo en dólares y saca las cuotas de lo pagado", () => {
    const d = filasADatos(
      {
        miembros: [{ id: "g", nombre: "Gastón", user_id: "u1" }],
        categorias: [{ id: "deuda", nombre: "Deuda", orden: 0 }],
        techos: [],
        ingresos: [],
        movimientos: [],
        pagos_fijos: [
          // En la base quedó 15 (se guardó antes del adelanto); con US$ 1.000 pagados son 14.
          { id: "pf", concepto: "Papá", categoria_id: "deuda", dia: 10, monto: "560000", es_deuda: true, activo: true, alta_desde: "2026-12-01", cuotas: 15, prestamo: true, usd_total: "6000.00", usd_cuota: "400.00" },
        ],
        pagos_mes: [{ id: "pm", pago_fijo_id: "pf", mes: "2026-12-01", monto: "1450000", pagado: true, movimiento_id: null, usd: "1000.00" }],
      },
      "2026-12-01",
    );
    expect(d.pagosFijos[0]).toMatchObject({ usdTotal: 6000, usdCuota: 400, cuotas: 14 });
    expect(d.pagosMes[0].usd).toBe(1000);
  });
});

describe("prepararImportacion", () => {
  const demo = datosDemo("2026-10-20");
  const hogar = [
    { id: "uuid-gaston", nombre: "Gastón" },
    { id: "uuid-jime", nombre: "Jime" },
  ];

  it("cambia todos los ids por uuid y mantiene las referencias", () => {
    const p = prepararImportacion(demo, hogar, "2026-11-01");
    const uuid = /^[0-9a-f-]{36}$/;
    const categorias = new Set(p.categorias.map((c) => c.id));
    const movimientos = new Set(p.movimientos.map((m) => m.id));
    expect(p.categorias.every((c) => uuid.test(c.id))).toBe(true);
    expect(p.movimientos.every((m) => categorias.has(m.categoriaId))).toBe(true);
    expect(p.pagosMes.every((pm) => pm.movimientoId === null || movimientos.has(pm.movimientoId))).toBe(true);
    expect(new Set(p.movimientos.map((m) => m.pagoPor))).toEqual(new Set(["uuid-gaston", "uuid-jime"]));
  });

  it("lleva las tarjetas con su dueño del hogar y las compras apuntan a la tarjeta nueva", () => {
    const p = prepararImportacion(demo, hogar, "2026-11-01");
    const tarjetas = new Map(p.tarjetas.map((t) => [t.id, t]));
    expect(p.tarjetas.map((t) => t.miembroId).sort()).toEqual(["uuid-gaston", "uuid-jime"]);
    const conTarjeta = p.pagosFijos.filter((pf) => pf.tarjetaId);
    expect(conTarjeta.length).toBeGreaterThan(0);
    expect(conTarjeta.every((pf) => tarjetas.has(pf.tarjetaId!))).toBe(true);
  });

  it("guarda los techos desde el mes más viejo con datos", () => {
    const p = prepararImportacion(demo, hogar, "2026-11-01");
    expect(new Set(p.techos.map((t) => t.mes))).toEqual(new Set(["2026-09-01"]));
    expect(p.techos.find((t) => t.categoriaId === p.categorias[0].id)?.monto).toBe(demo.categorias[0].techo);
  });

  it("empareja miembros por nombre sin importar tildes ni mayúsculas", () => {
    const p = prepararImportacion(demo, [{ id: "a", nombre: "gaston" }, { id: "b", nombre: "JIME" }], "2026-11-01");
    expect(p.ingresos.map((i) => i.miembroId)).toEqual(["a", "b"]);
  });

  it("frena si alguien del archivo no es del hogar", () => {
    expect(() => prepararImportacion(demo, [hogar[0]], "2026-11-01")).toThrow(/Jime/);
  });
});

describe("operaciones", () => {
  it("marcar y desmarcar un pago fijo crea y borra el gasto", () => {
    const d = datosDemo("2026-10-01");
    const pf = d.pagosFijos[0];
    const marcado = op.marcarPagado(d, pf.id, "2026-10-01", "gaston", "mov-nuevo", "2026-10-01");
    expect(marcado.movimientos).toHaveLength(d.movimientos.length + 1);
    expect(marcado.movimientos.at(-1)).toMatchObject({ id: "mov-nuevo", monto: pf.monto, fecha: "2026-10-01" });
    const desmarcado = op.desmarcarPagado(marcado, pf.id, "2026-10-01");
    expect(desmarcado.movimientos).toHaveLength(d.movimientos.length);
    expect(desmarcado.pagosMes.find((p) => p.pagoFijoId === pf.id && p.mes === "2026-10-01")?.pagado).toBe(false);
  });
});
