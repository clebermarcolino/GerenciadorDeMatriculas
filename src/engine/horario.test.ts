import { describe, it, expect } from "vitest";
import { parseHorario, horaInicio, rotulo, temChoque, blocosEmChoque } from "./horario";

describe("parseHorario", () => {
  it("expande dias x slots", () => {
    const b = parseHorario("24M23");
    expect(b).toHaveLength(4);
    expect(b.map((x) => x.dia).sort()).toEqual([2, 2, 4, 4]);
  });

  it("M23 = 08h-10h e M45 = 10h-12h", () => {
    expect(parseHorario("2M23").map(horaInicio)).toEqual([8, 9]);
    expect(parseHorario("2M45").map(horaInicio)).toEqual([10, 11]);
  });

  it("T12 = 13h-15h", () => {
    expect(parseHorario("2T12").map(horaInicio)).toEqual([13, 14]);
  });

  it("aceita múltiplos grupos", () => {
    expect(parseHorario("35T12 6M45")).toHaveLength(6);
  });

  it("ignora código inválido", () => {
    expect(parseHorario("xyz")).toEqual([]);
  });
});

describe("choque", () => {
  it("detecta choque no mesmo dia/slot", () => {
    expect(temChoque(parseHorario("24M23"), parseHorario("3M45 4M3"))).toBe(true);
  });

  it("não detecta choque em slots diferentes", () => {
    expect(temChoque(parseHorario("24M23"), parseHorario("24M45"))).toBe(false);
  });

  it("rotulo do conflito", () => {
    const c = blocosEmChoque(parseHorario("35M45"), parseHorario("3M4"));
    expect(rotulo(c[0])).toBe("Terça às 10h");
  });
});

import { descreverBlocos } from "./horario";

describe("descreverBlocos", () => {
  it("junta slots consecutivos em um intervalo", () => {
    expect(descreverBlocos(parseHorario("24M23"))).toBe("Segunda 8h–10h; Quarta 8h–10h");
    expect(descreverBlocos(parseHorario("4M2345"))).toBe("Quarta 8h–12h");
  });

  it("separa manhã e tarde no mesmo dia", () => {
    expect(descreverBlocos(parseHorario("4M45 4T12"))).toBe("Quarta 10h–12h; Quarta 13h–15h");
  });
});
