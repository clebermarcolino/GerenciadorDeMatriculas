export type Situacao =
  | "APROVADO"
  | "EQUIVALÊNCIA"
  | "APROVEITADO"
  | "MATRICULADO"
  | "REPROVADO"
  | "TRANCADO"
  | "CANCELADO"
  | "PENDENTE";

export interface DisciplinaHistorico {
  codigo: string;
  nome: string;
  ch: number;
  situacao: Situacao;
  tipo: string;
  secao: string;
  ano_sem: string | null;
  turma: string | null;
  nota: number | null;
  via_equivalente: boolean;
}

export interface LinhaCH {
  basicos: number;
  obrigatorios: number;
  optativos: number;
  flexiveis: number;
  total: number;
}

export interface Totalizacao {
  exigido: LinhaCH;
  integralizado: LinhaCH;
  pendente: LinhaCH;
}

export interface EquivalenciaCumprida {
  codigo: string;
  nome: string;
  via_codigo: string;
  via_nome: string;
}

export interface Historico {
  nome: string | null;
  matricula: string | null;
  curso: string | null;
  cra: number | null;
  ch_exigida: number | null;
  ch_integralizada: number | null;
  ch_pendente: number | null;
  totalizacao: Totalizacao | null;
  disciplinas: DisciplinaHistorico[];
  equivalencias: EquivalenciaCumprida[];
  avisos: string[];
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const num = (s: string) => Number(s.replace(",", "."));

const RE_SITUACAO_FIM =
  /\s+(MATRICULADO(?:\s+EQUIVALENTE)?|APROVADO|REPROVADO(?:\s+POR\s+\S+)?|TRANCADO|CANCELADO|EQUIVAL[EÊ]NCIA|APROVEITADO|DISPENSADO|PENDENTE)\s*$/i;

const RE_LINHA =
  /^(?<codigo>[A-Z]{3,5}\d{4,5}|\d{7})\s+(?<nome>.+?)\s+(?<ch>\d{1,3})\s+(?<tipo>[A-Z]{2})(?:\s+(?<ano>\d{4}\.\d|---))?(?:\s+(?<turma>\d{1,2}|---))?(?:\s+(?<nota>\d{1,2}[.,]\d|---))?$/;

const RE_COMECA_COM_CODIGO = /^([A-Z]{3,5}\d{4,5}|\d{7})\s/;

function normalizarSituacao(bruta: string): { situacao: Situacao; via_equivalente: boolean } {
  const s = semAcento(bruta).toUpperCase().replace(/\s+/g, " ").trim();
  if (s.startsWith("MATRICULADO")) {
    return { situacao: "MATRICULADO", via_equivalente: s.includes("EQUIVALENTE") };
  }
  if (s.startsWith("EQUIVALENCIA")) return { situacao: "EQUIVALÊNCIA", via_equivalente: false };
  if (s.startsWith("REPROVADO")) return { situacao: "REPROVADO", via_equivalente: false };
  if (s === "DISPENSADO") return { situacao: "APROVEITADO", via_equivalente: false };
  return { situacao: s as Situacao, via_equivalente: false };
}

export function parseLinhaDisciplina(linha: string, secao: string): DisciplinaHistorico | null {
  const sit = linha.match(RE_SITUACAO_FIM);
  if (!sit) return null;
  const semSit = linha.slice(0, sit.index).trim();
  const m = semSit.match(RE_LINHA);
  if (!m?.groups) return null;

  const { codigo, nome, ch, tipo, ano, turma, nota } = m.groups;
  const { situacao, via_equivalente } = normalizarSituacao(sit[1]);

  return {
    codigo,
    nome: nome.trim(),
    ch: Number(ch),
    situacao,
    tipo,
    secao,
    ano_sem: ano && ano !== "---" ? ano : null,
    turma: turma && turma !== "---" ? turma : null,
    nota: nota && nota !== "---" ? num(nota) : null,
    via_equivalente,
  };
}

function primeiro(linhas: string[], re: RegExp): string | null {
  for (const l of linhas) {
    const m = l.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

function extrairCra(linhas: string[]): number | null {
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const mesma = l.match(/\bCRA:\s*(\d{1,2}[.,]\d+)/);
    if (mesma) return num(mesma[1]);
    // no SIGAA o valor vem em uma linha própria logo abaixo de "CRA:"
    if (/\bCRA:$/.test(l)) {
      for (let j = i + 1; j <= i + 3 && j < linhas.length; j++) {
        if (/^\d{1,2}[.,]\d{1,2}$/.test(linhas[j])) return num(linhas[j]);
      }
    }
  }
  return null;
}

function extrairTotalizacao(linhas: string[]): Totalizacao | null {
  const linhaCH = (rotulo: string): LinhaCH | null => {
    const re = new RegExp(`^${rotulo}\\s+((?:\\d+\\s*){5})$`);
    for (const l of linhas) {
      const m = l.match(re);
      if (m) {
        const [basicos, obrigatorios, optativos, flexiveis, total] = m[1].trim().split(/\s+/).map(Number);
        return { basicos, obrigatorios, optativos, flexiveis, total };
      }
    }
    return null;
  };
  const exigido = linhaCH("Exigido");
  const integralizado = linhaCH("Integralizado");
  const pendente = linhaCH("Pendente");
  return exigido && integralizado && pendente ? { exigido, integralizado, pendente } : null;
}

function extrairEquivalencias(linhas: string[]): EquivalenciaCumprida[] {
  const out: EquivalenciaCumprida[] = [];
  const re = /^Cumpriu\s*\((\w+)\)\s*(.+?)\s+atrav[eé]s de\s+(.+?)\s*\((\w+)\)\s*$/i;
  for (const l of linhas) {
    const m = l.match(re);
    if (m) out.push({ codigo: m[1], nome: m[2], via_nome: m[3], via_codigo: m[4] });
  }
  return out;
}

export function parseHistorico(linhas: string[]): Historico {
  const disciplinas: DisciplinaHistorico[] = [];
  const avisos: string[] = [];
  let secao = "";

  for (const linha of linhas) {
    const sec = semAcento(linha).toUpperCase();
    const mp = sec.match(/^PERIODO\s+(\d+)$/);
    if (mp) {
      secao = `PERÍODO ${mp[1]}`;
      continue;
    }
    if (sec === "PERIODO ELETIVO") {
      secao = "ELETIVO";
      continue;
    }
    if (sec === "EXTRACURRICULAR") {
      secao = "EXTRACURRICULAR";
      continue;
    }

    if (!RE_COMECA_COM_CODIGO.test(linha)) continue;
    const d = parseLinhaDisciplina(linha, secao);
    if (d) disciplinas.push(d);
    else avisos.push(linha);
  }

  const totalizacao = extrairTotalizacao(linhas);

  return {
    nome: primeiro(linhas, /^Nome:\s*(.+?)(?:\s+Matr[ií]cula:.*)?$/),
    matricula: primeiro(linhas, /Matr[ií]cula:\s*(\d{6,})/),
    curso: primeiro(linhas, /^Curso:\s*(.+)$/),
    cra: extrairCra(linhas),
    ch_exigida: totalizacao?.exigido.total ?? null,
    ch_integralizada: totalizacao?.integralizado.total ?? null,
    ch_pendente: totalizacao?.pendente.total ?? null,
    totalizacao,
    disciplinas,
    equivalencias: extrairEquivalencias(linhas),
    avisos,
  };
}

export const SITUACOES_CONCLUIDAS: readonly Situacao[] = ["APROVADO", "EQUIVALÊNCIA", "APROVEITADO"];

const PRIORIDADE: Record<Situacao, number> = {
  APROVADO: 3,
  EQUIVALÊNCIA: 3,
  APROVEITADO: 3,
  MATRICULADO: 2,
  REPROVADO: 1,
  TRANCADO: 1,
  CANCELADO: 1,
  PENDENTE: 0,
};

export function situacaoFinalPorCodigo(h: Historico): Map<string, Situacao> {
  const mapa = new Map<string, Situacao>();
  for (const d of h.disciplinas) {
    const atual = mapa.get(d.codigo);
    if (!atual || PRIORIDADE[d.situacao] > PRIORIDADE[atual]) mapa.set(d.codigo, d.situacao);
  }
  return mapa;
}

export function codigosConcluidos(h: Historico): Set<string> {
  const s = new Set<string>();
  for (const [cod, sit] of situacaoFinalPorCodigo(h)) {
    if (SITUACOES_CONCLUIDAS.includes(sit)) s.add(cod);
  }
  return s;
}

export function codigosEmCursamento(h: Historico): Set<string> {
  const s = new Set<string>();
  for (const [cod, sit] of situacaoFinalPorCodigo(h)) if (sit === "MATRICULADO") s.add(cod);
  return s;
}
