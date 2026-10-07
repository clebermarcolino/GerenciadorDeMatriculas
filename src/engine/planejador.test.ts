import { describe, it, expect } from "vitest";
import { OFERTA } from "./oferta";
import { MATRIZ } from "./elegibilidade";
import { cargaHorariaTotal, tentarAdicionar } from "./planejador";

const turma = (cod: string) => OFERTA.turmas.find((t) => t.codigo === cod)!;

describe("Regra 3: validador de choque", () => {
  it("aceita turmas em horários diferentes", () => {
    expect(tentarAdicionar([turma("8103140")], turma("8103125"))).toEqual({ ok: true }); // M23 x M45
  });

  it("bloqueia choque e explica onde", () => {
    const r = tentarAdicionar([turma("8103140")], turma("8103215"));
    expect(r.ok).toBe(false);
    if (!r.ok && r.motivo === "CHOQUE") {
      expect(r.conflitos).toHaveLength(1);
      expect(r.mensagem).toBe(
        "Choque de horário com CÁLCULO DIFERENCIAL E INTEGRAL (Segunda 8h–10h; Quarta 8h–10h)"
      );
    }
  });

  it("choque parcial: um dia só", () => {
    const r = tentarAdicionar([turma("8103106")], turma("8103140"));
    expect(r.ok).toBe(false);
    if (!r.ok && r.motivo === "CHOQUE") expect(r.mensagem).toContain("Quarta 8h–10h");
  });

  it("reporta choque com mais de uma turma do carrinho", () => {
    const r = tentarAdicionar([turma("8103140"), turma("8103106")], turma("8103215"));
    expect(r.ok).toBe(false);
    if (!r.ok && r.motivo === "CHOQUE") expect(r.conflitos).toHaveLength(2);
  });

  it("não adiciona duas vezes a mesma turma", () => {
    const r = tentarAdicionar([turma("8103140")], turma("8103140"));
    expect(r).toMatchObject({ ok: false, motivo: "JA_NO_CARRINHO" });
  });

  it("soma a carga horária pela matriz", () => {
    expect(cargaHorariaTotal([turma("8103140"), turma("8103125")], MATRIZ)).toBe(120);
  });
});
