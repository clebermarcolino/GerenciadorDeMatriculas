import type { Historico } from "./historico";

export interface ResultadoValidacao {
  valido: boolean;
  motivo: string | null;
}

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

export function validarHistorico(linhas: string[], h: Historico): ResultadoValidacao {
  const texto = normalizar(linhas.join("\n"));

  if (texto.replace(/\s/g, "").length < 50) {
    return {
      valido: false,
      motivo:
        "Não consegui ler texto neste PDF. Ele pode ser um documento digitalizado (imagem). Envie o PDF original baixado do SIGAA.",
    };
  }

  const marcadores = [
    texto.includes("HISTORICO ESCOLAR"),
    texto.includes("UNIVERSIDADE FEDERAL DA PARAIBA"),
    texto.includes("SIGAA.UFPB.BR"),
  ];
  if (!marcadores.every(Boolean)) {
    return {
      valido: false,
      motivo:
        "Este arquivo não parece ser um Histórico Escolar do SIGAA/UFPB. Baixe o histórico no SIGAA e envie o PDF original.",
    };
  }

  if (!h.matricula || h.disciplinas.length === 0) {
    return {
      valido: false,
      motivo:
        "Reconheci o documento, mas não encontrei a matrícula e as disciplinas. O formato do histórico pode ter mudado ou o arquivo está incompleto. Envie o PDF original do SIGAA.",
    };
  }

  return { valido: true, motivo: null };
}