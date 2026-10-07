import { describe, it, expect } from "vitest";
import { MATRIZ, criarContexto, avaliar, avaliarMatriz } from "./elegibilidade";
import { parseHistorico } from "./historico";
import { LINHAS } from "./__fixtures__/historico.linhas";

function hist(...itens: [string, string][]) {
  return parseHistorico([
    "PERÍODO 1",
    ...itens.map(([c, s]) => `${c} DISCIPLINA 60 OB 2022.1 01 8.0 ${s}`),
  ]);
}

describe("integridade da matriz", () => {
  const codigos = new Set(MATRIZ.disciplinas.map((d) => d.codigo));

  it("todo pré-requisito existe na matriz", () => {
    for (const d of MATRIZ.disciplinas) for (const p of d.prerequisitos) expect(codigos.has(p)).toBe(true);
  });

  it("não há ciclos", () => {
    const porCodigo = new Map(MATRIZ.disciplinas.map((d) => [d.codigo, d]));
    const estado = new Map<string, number>();
    const visita = (c: string) => {
      if (estado.get(c) === 2) return;
      expect(estado.get(c)).not.toBe(1);
      estado.set(c, 1);
      porCodigo.get(c)!.prerequisitos.forEach(visita);
      estado.set(c, 2);
    };
    codigos.forEach(visita);
  });

  it("31 obrigatórias/complementares e 5 optativas têm antecessor", () => {
    const comPre = MATRIZ.disciplinas.filter((d) => d.prerequisitos.length);
    expect(comPre.filter((d) => d.tipo !== "OP")).toHaveLength(31);
    expect(comPre.filter((d) => d.tipo === "OP")).toHaveLength(5);
  });

  it("as 9 equivalências do fluxograma estão cadastradas", () => {
    const pares = MATRIZ.equivalencias.filter((e) => e.codigo !== "8103108");
    expect(pares).toHaveLength(9);
  });
});

describe("Regra 1 com histórico real", () => {
  const ctx = criarContexto(parseHistorico(LINHAS));
  const st = (c: string) => avaliar(c, ctx).status;

  it("concluídas (aprovado, equivalência, aproveitado)", () => {
    expect(st("8103104")).toBe("CONCLUIDA");
    expect(st("8103138")).toBe("CONCLUIDA"); 
    expect(st("8103145")).toBe("CONCLUIDA"); 
    expect(st("8103140")).toBe("CONCLUIDA");
  });

  it("equivalência vale nos dois sentidos", () => {
    expect(st("8103180")).toBe("CONCLUIDA");
    expect(st("8103108")).toBe("CONCLUIDA");
  });

  it("em cursamento, inclusive via componente equivalente", () => {
    expect(st("8103144")).toBe("EM_CURSAMENTO");
    expect(st("8103135")).toBe("EM_CURSAMENTO");
  });

  it("Estágio não é matrícula em turma", () => {
    expect(st("8103216")).toBe("SEM_TURMA");
  });

  it("TCC está apto (Gerência de Projeto concluída)", () => {
    expect(st("8103165")).toBe("APTA");
  });

  it("Língua Inglesa I conta como em cursamento via Inglês Instrumental (8105003)", () => {
    expect(st("8105014")).toBe("EM_CURSAMENTO");
    expect(st("8105015")).toBe("PREREQ_FALTANTE");
  });

  it("aptas deste aluno: TCC e as optativas com pré-requisito já cumprido", () => {
    const r = avaliarMatriz(ctx);
    expect(r.filter((x) => x.status === "APTA").map((x) => x.codigo).sort()).toEqual(
      ["8103165", "8103172", "8103205", "8103221"].sort()
    );
    expect(r.filter((x) => x.status === "PREREQ_FALTANTE").map((x) => x.codigo)).toEqual(["8105015"]);
  });
});

describe("Regra 1 com históricos sintéticos", () => {
  it("só 8103104 cumprida: 8103125 apta, 8103141 sem pré-requisito", () => {
    const ctx = criarContexto(hist(["8103104", "APROVADO"]));
    expect(avaliar("8103125", ctx).status).toBe("APTA");
    const r = avaliar("8103141", ctx);
    expect(r.status).toBe("PREREQ_FALTANTE");
    expect(r.faltantes.map((f) => f.codigo)).toEqual(["8103125"]);
  });

  it("8103161 exige 8103215 E 8103152", () => {
    const so = criarContexto(hist(["8103215", "APROVADO"]));
    const r = avaliar("8103161", so);
    expect(r.status).toBe("PREREQ_FALTANTE");
    expect(r.faltantes.map((f) => f.codigo)).toEqual(["8103152"]);

    const ambos = criarContexto(hist(["8103215", "APROVADO"], ["8103152", "APROVADO"]));
    expect(avaliar("8103161", ambos).status).toBe("APTA");
  });

  it("pré-requisito MATRICULADO ainda não conta como cumprido", () => {
    const ctx = criarContexto(hist(["8103125", "MATRICULADO"]));
    expect(avaliar("8103141", ctx).status).toBe("PREREQ_FALTANTE");
  });

  it("REPROVADO não conta", () => {
    const ctx = criarContexto(hist(["8103104", "REPROVADO"]));
    expect(avaliar("8103125", ctx).status).toBe("PREREQ_FALTANTE");
  });

  it("código fora da matriz (optativa) é apto e sinalizado", () => {
    const r = avaliar("9999999", criarContexto(hist()));
    expect(r).toMatchObject({ status: "APTA", fora_da_matriz: true });
  });
});
