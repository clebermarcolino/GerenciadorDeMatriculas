import { describe, it, expect } from "vitest";
import {
  parseHistorico,
  parseLinhaDisciplina,
  situacaoFinalPorCodigo,
  codigosConcluidos,
  codigosEmCursamento,
} from "./historico";
import { LINHAS } from "./__fixtures__/historico.linhas";

const h = parseHistorico(LINHAS);
const porCodigo = (c: string) => h.disciplinas.filter((d) => d.codigo === c);

describe("dados cadastrais", () => {
  it("extrai nome, matrícula, curso e CRA", () => {
    expect(h.nome).toBe("ALUNO DE TESTE");
    expect(h.matricula).toBe("20220000000");
    expect(h.curso).toContain("SISTEMAS DE INFORMAÇÃO");
    expect(h.cra).toBe(8.1);
  });

  it("extrai a totalização de carga horária", () => {
    expect(h.ch_exigida).toBe(3000);
    expect(h.ch_integralizada).toBe(2580);
    expect(h.ch_pendente).toBe(420);
    expect(h.totalizacao?.integralizado).toEqual({
      basicos: 1500,
      obrigatorios: 840,
      optativos: 180,
      flexiveis: 60,
      total: 2580,
    });
  });
});

describe("disciplinas", () => {
  it("reconhece todas as linhas de componente, sem avisos", () => {
    expect(h.avisos).toEqual([]);
    expect(h.disciplinas).toHaveLength(54);
  });

  it("lê campos de uma linha normal", () => {
    expect(porCodigo("8103104")[0]).toMatchObject({
      nome: "INTRODUCAO A PROGRAMACAO",
      ch: 60,
      tipo: "OB",
      ano_sem: "2022.1",
      turma: "02",
      nota: 8.5,
      situacao: "APROVADO",
      secao: "PERÍODO 1",
    });
  });

  it("aceita código com letras (DCET00233)", () => {
    expect(porCodigo("DCET00233")[0]).toMatchObject({ nome: "MATEMÁTICA DISCRETA", situacao: "APROVADO" });
  });

  it("EQUIVALÊNCIA sem ano/turma/nota", () => {
    expect(porCodigo("8103138")[0]).toMatchObject({
      situacao: "EQUIVALÊNCIA",
      ano_sem: null,
      turma: null,
      nota: null,
    });
  });

  it("'MATRICULADO EQUIVALENTE' vira MATRICULADO (e não EQUIVALÊNCIA)", () => {
    expect(porCodigo("8103144")[0]).toMatchObject({ situacao: "MATRICULADO", via_equivalente: true });
  });

  it("APROVEITADO no período eletivo", () => {
    expect(porCodigo("8103164")[0]).toMatchObject({ situacao: "APROVEITADO", secao: "ELETIVO" });
  });

  it("PENDENTE (TCC e Estágio, 300h)", () => {
    expect(porCodigo("8103165")[0].situacao).toBe("PENDENTE");
    expect(porCodigo("8103216")[0]).toMatchObject({ situacao: "PENDENTE", ch: 300 });
  });

  it("extracurricular: CH 30 e matriculado no semestre atual", () => {
    expect(porCodigo("8101236")[0]).toMatchObject({ ch: 30, tipo: "EC", secao: "EXTRACURRICULAR" });
    expect(porCodigo("8105003")[0]).toMatchObject({ situacao: "MATRICULADO", ano_sem: "2026.2" });
  });
});

describe("equivalências cumpridas", () => {
  it("lê as duas equivalências do rodapé", () => {
    expect(h.equivalencias).toEqual([
      {
        codigo: "8103138",
        nome: "PROGRAMACAO ORIENTADA A OBJETOS",
        via_codigo: "8103180",
        via_nome: "ANALISE E PROJETOS DE SISTEMAS",
      },
      {
        codigo: "8103145",
        nome: "PESQUISA APLIC A SISTEMAS DE INFORMACAO",
        via_codigo: "8103166",
        via_nome: "PESQUISA APLICADA A COMPUTACAO",
      },
    ]);
  });
});

describe("situação final por código", () => {
  const final = situacaoFinalPorCodigo(h);

  it("TRANCADO + APROVADO => APROVADO", () => expect(final.get("8103140")).toBe("APROVADO"));
  it("CANCELADO + APROVADO => APROVADO", () => expect(final.get("8101231")).toBe("APROVADO"));
  it("REPROVADO + MATRICULADO => MATRICULADO", () => expect(final.get("8103135")).toBe("MATRICULADO"));

  it("conjuntos de concluídas e em cursamento", () => {
    const c = codigosConcluidos(h);
    const m = codigosEmCursamento(h);
    expect(c.has("8103138")).toBe(true);
    expect(c.has("8103164")).toBe(true);
    expect(c.has("8103165")).toBe(false);
    expect(m).toEqual(new Set(["8103144", "8103135", "8105003"]));
  });
});

describe("robustez", () => {
  it("linha de código sem situação conhecida vira aviso", () => {
    const r = parseHistorico(["PERÍODO 1", "8101105 INTRODUCAO A SOCIOLOGIA 60 OB 2022.1 03 5.7 XPTO"]);
    expect(r.disciplinas).toHaveLength(0);
    expect(r.avisos).toHaveLength(1);
  });

  it("REPROVADO POR FALTA vira REPROVADO", () => {
    const d = parseLinhaDisciplina("8103135 ALGEBRA LINEAR 60 EQ 2025.1 01 0.0 REPROVADO POR FALTA", "X");
    expect(d?.situacao).toBe("REPROVADO");
  });

  it("não confunde 'Currículo: 0722009' com disciplina", () => {
    expect(parseHistorico(["Currículo: 0722009"]).avisos).toEqual([]);
  });
});
