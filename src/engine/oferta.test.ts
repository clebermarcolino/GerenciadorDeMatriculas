import { describe, it, expect } from "vitest";
import { OFERTA, avaliarOferta } from "./oferta";
import { MATRIZ, criarContexto } from "./elegibilidade";
import { parseHistorico } from "./historico";
import { parseHorario } from "./horario";
import { LINHAS } from "./__fixtures__/historico.linhas";

const turma = (cod: string) => OFERTA.turmas.find((t) => t.codigo === cod)!;

describe("oferta.json", () => {
  it("todo código identificado existe na matriz", () => {
    const codigos = new Set(MATRIZ.disciplinas.map((d) => d.codigo));
    for (const t of OFERTA.turmas) if (t.codigo) expect(codigos.has(t.codigo)).toBe(true);
  });

  it("todo horário gera blocos válidos", () => {
    for (const t of OFERTA.turmas) expect(parseHorario(t.horario).length).toBeGreaterThan(0);
  });

  it("converte a grade da planilha em códigos UFPB", () => {
    expect(turma("8103140").horario).toBe("24M23");
    expect(turma("8103125").horario).toBe("24M45");
    expect(turma("8103126").horario).toBe("3M45 5M23");
    expect(turma("8103106").horario).toBe("4M2345"); 
    expect(turma("8103157").horario).toBe("4M45 2T12");
  });

  it("separa disciplinas na mesma célula ('A / B')", () => {
    expect(turma("8103148")).toMatchObject({ professores: ["Renata"], horario: "2M23 4T12" });
    expect(turma("8103215")).toMatchObject({ professores: ["Raquel Vigolvino"], horario: "24M23" });
    expect(turma("8105002").professores).toEqual(["Michaella Araújo"]);
    expect(turma("8105031").professores).toEqual(["Carla Pereira"]);
  });

  it("'Análise de Dados' fica sem código (precisa de confirmação)", () => {
    expect(OFERTA.turmas.filter((t) => t.codigo === null).map((t) => t.nome)).toEqual(["ANÁLISE DE DADOS"]);
  });
});

describe("Regra 1 aplicada à oferta (histórico real)", () => {
  const ctx = criarContexto(parseHistorico(LINHAS));
  const res = avaliarOferta(ctx);
  const st = (cod: string) => res.find((r) => r.turma.codigo === cod)?.elegibilidade?.status;

  it("já concluídas, em cursamento, sem turma e aptas", () => {
    expect(st("8103140")).toBe("CONCLUIDA");
    expect(st("8103144")).toBe("EM_CURSAMENTO"); 
    expect(st("8105014")).toBe("EM_CURSAMENTO");
    expect(st("8103216")).toBe("SEM_TURMA");
    expect(st("8103165")).toBe("APTA");
  });

  it("turma sem código não é avaliada", () => {
    expect(res.find((r) => r.turma.codigo === null)?.elegibilidade).toBeNull();
  });
});
