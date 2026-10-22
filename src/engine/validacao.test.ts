import { describe, it, expect } from "vitest";
import { parseHistorico } from "./historico";
import { validarHistorico } from "./validacao";
import { LINHAS } from "./__fixtures__/historico.linhas";

const validar = (linhas: string[]) => validarHistorico(linhas, parseHistorico(linhas));

describe("validarHistorico", () => {
  it("aceita um histórico real do SIGAA", () => {
    expect(validar(LINHAS)).toEqual({ valido: true, motivo: null });
  });

  it("rejeita PDF sem texto (digitalizado)", () => {
    const r = validar([]);
    expect(r.valido).toBe(false);
    expect(r.motivo).toContain("digitalizado");
  });

  it("rejeita um PDF qualquer", () => {
    const r = validar([
      "Fatura do cartão de crédito",
      "Vencimento 10/10/2026",
      "Total a pagar R$ 1.234,56",
      "Pagamento mínimo R$ 123,45 - consulte o aplicativo do banco para mais detalhes",
    ]);
    expect(r.valido).toBe(false);
    expect(r.motivo).toContain("não parece ser um Histórico Escolar");
  });

  it("rejeita histórico de outra instituição", () => {
    const outra = LINHAS.map((l) =>
      l
        .replace(/Universidade Federal da Paraíba/g, "Universidade Federal do Rio Grande do Norte")
        .replace(/sigaa\.ufpb\.br/g, "sigaa.ufrn.br")
    );
    expect(validar(outra).valido).toBe(false);
  });

  it("rejeita documento da UFPB que não é histórico (ex.: sem o título)", () => {
    const semTitulo = LINHAS.filter((l) => !/Hist[óo]rico Escolar/i.test(l));
    expect(validar(semTitulo).valido).toBe(false);
  });

  it("rejeita quando os marcadores existem mas não há disciplinas", () => {
    const semTabela = LINHAS.filter((l) => !/^(\d{7}|[A-Z]{3,5}\d{4,5})\s/.test(l));
    const r = validar(semTabela);
    expect(r.valido).toBe(false);
    expect(r.motivo).toContain("não encontrei a matrícula e as disciplinas");
  });
});