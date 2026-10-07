import ofertaJson from "../data/oferta.json";
import { avaliar, type Contexto, type ResultadoElegibilidade } from "./elegibilidade";

export interface TurmaOfertada {
  codigo: string | null;
  nome: string;
  compartilhada: boolean;
  optativa: boolean;
  periodo_grade: number;
  professores: string[];
  salas: string[];
  horario: string;
}

export interface Oferta {
  semestre: string | null;
  fonte: string;
  turmas: TurmaOfertada[];
}

export const OFERTA = ofertaJson as Oferta;

export interface TurmaAvaliada {
  turma: TurmaOfertada;
  elegibilidade: ResultadoElegibilidade | null;
}

export const idTurma = (t: TurmaOfertada) => t.codigo ?? `nome:${t.nome}`;

export function avaliarOferta(ctx: Contexto, oferta: Oferta = OFERTA): TurmaAvaliada[] {
  return oferta.turmas.map((turma) => ({
    turma,
    elegibilidade: turma.codigo ? avaliar(turma.codigo, ctx) : null,
  }));
}
