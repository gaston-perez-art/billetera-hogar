import { describe, expect, it } from "vitest";
import { motivoRecordatorio } from "./recordatorio";

const f = (s: string) => new Date(s);

describe("recordatorio para cargar", () => {
  it("no aparece si cargó hace poco", () => {
    expect(motivoRecordatorio(["2026-11-06T10:00:00"], f("2026-11-06T20:00:00"), null)).toBeNull();
  });
  it("aparece si pasaron más de 24 horas", () => {
    expect(motivoRecordatorio(["2026-11-05T09:00:00"], f("2026-11-06T10:00:00"), null)).toBe("un-dia");
  });
  it("cerrado hoy, no vuelve hasta mañana", () => {
    expect(motivoRecordatorio(["2026-11-05T09:00:00"], f("2026-11-06T18:00:00"), f("2026-11-06T10:00:00"))).toBeNull();
    expect(motivoRecordatorio(["2026-11-05T09:00:00"], f("2026-11-07T08:00:00"), f("2026-11-06T10:00:00"))).toBe("un-dia");
  });
  it("pasadas las 23, si hoy no cargó nada", () => {
    expect(motivoRecordatorio(["2026-11-05T22:00:00"], f("2026-11-06T23:10:00"), null)).toBe("noche");
    expect(motivoRecordatorio(["2026-11-06T13:00:00"], f("2026-11-06T23:10:00"), null)).toBeNull();
  });
  it("a la noche vuelve aunque lo haya cerrado a la mañana, pero no dos veces", () => {
    expect(motivoRecordatorio(["2026-11-05T22:00:00"], f("2026-11-06T23:10:00"), f("2026-11-06T09:00:00"))).toBe("noche");
    expect(motivoRecordatorio(["2026-11-05T22:00:00"], f("2026-11-06T23:40:00"), f("2026-11-06T23:15:00"))).toBeNull();
  });
  it("sin ninguna carga, también avisa", () => {
    expect(motivoRecordatorio([], f("2026-11-06T12:00:00"), null)).toBe("un-dia");
  });
});
