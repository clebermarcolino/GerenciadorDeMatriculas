import { codigosConcluidos, codigosEmCursamento, type Historico } from "./historico";
import matrizJson from "../data/matriz_curricular.json";

export interface DisciplinaMatriz {
  codigo: string;
  nome: string;
  periodo: number;
  ch: number | null;
  tipo: string;
  prerequisitos: string[];
  legado?: boolean;
}

export interface Matriz {
  curriculo: string;
  disciplinas: DisciplinaMatriz[];
  equivalencias: { codigo: string; equivalentes: string[] }[];
  sem_turma: string[];
}

export const MATRIZ = matrizJson as Matriz;

export type StatusElegibilidade =
  | "APTA"
  | "CONCLUIDA"
  | "EM_CURSAMENTO"
  | "PREREQ_FALTANTE"
  | "SEM_TURMA";

export interface ResultadoElegibilidade {
  codigo: string;
  nome: string | null;
  status: StatusElegibilidade;
  faltantes: { codigo: string; nome: string }[];
  fora_da_matriz: boolean;
}

export interface Contexto {
  matriz: Matriz;
  porCodigo: Map<string, DisciplinaMatriz>;
  rep: (codigo: string) => string;
  concluidas: Set<string>; 
  cursando: Set<string>;
  semTurma: Set<string>;
}

function criarClasses(eqs: Matriz["equivalencias"]): (c: string) => string {
  const pai = new Map<string, string>();
  const find = (c: string): string => {
    const p = pai.get(c);
    if (p === undefined || p === c) return c;
    const r = find(p);
    pai.set(c, r);
    return r;
  };
  for (const { codigo, equivalentes } of eqs) {
    for (const e of equivalentes) {
      const a = find(codigo);
      const b = find(e);
      if (a !== b) pai.set(b, a);
    }
  }
  return find;
}

export function criarContexto(historico: Historico, matriz: Matriz = MATRIZ): Contexto {
  const rep = criarClasses(matriz.equivalencias);
  const concluidas = new Set([...codigosConcluidos(historico)].map(rep));
  const cursando = new Set([...codigosEmCursamento(historico)].map(rep));
  return {
    matriz,
    porCodigo: new Map(matriz.disciplinas.map((d) => [d.codigo, d])),
    rep,
    concluidas,
    cursando,
    semTurma: new Set(matriz.sem_turma),
  };
}

export function avaliar(codigo: string, ctx: Contexto): ResultadoElegibilidade {
  const d = ctx.porCodigo.get(codigo);
  const base = { codigo, nome: d?.nome ?? null, faltantes: [], fora_da_matriz: !d };
  const r = ctx.rep(codigo);

  if (ctx.concluidas.has(r)) return { ...base, status: "CONCLUIDA" };
  if (ctx.cursando.has(r)) return { ...base, status: "EM_CURSAMENTO" };
  if (ctx.semTurma.has(codigo)) return { ...base, status: "SEM_TURMA" };

  const faltantes = (d?.prerequisitos ?? [])
    .filter((p) => !ctx.concluidas.has(ctx.rep(p)))
    .map((p) => ({ codigo: p, nome: ctx.porCodigo.get(p)?.nome ?? p }));

  if (faltantes.length) return { ...base, status: "PREREQ_FALTANTE", faltantes };
  return { ...base, status: "APTA" };
}

export function avaliarVarias(codigos: string[], ctx: Contexto): ResultadoElegibilidade[] {
  return codigos.map((c) => avaliar(c, ctx));
}

export function avaliarMatriz(ctx: Contexto): ResultadoElegibilidade[] {
  return avaliarVarias(
    ctx.matriz.disciplinas.filter((d) => !d.legado).map((d) => d.codigo),
    ctx
  );
}

export const ROTULO: Record<StatusElegibilidade, string> = {
  APTA: "Apta",
  CONCLUIDA: "Não apta · já concluída",
  EM_CURSAMENTO: "Não apta · em cursamento",
  PREREQ_FALTANTE: "Não apta · pré-requisito faltante",
  SEM_TURMA: "Sem matrícula em turma",
};
