import { blocosEmChoque, descreverBlocos, parseHorario, type Bloco } from "./horario";
import { idTurma, type TurmaOfertada } from "./oferta";
import type { Matriz } from "./elegibilidade";

export interface Conflito {
  com: TurmaOfertada;
  blocos: Bloco[];
}

export type Tentativa =
  | { ok: true }
  | { ok: false; motivo: "JA_NO_CARRINHO"; mensagem: string }
  | { ok: false; motivo: "CHOQUE"; mensagem: string; conflitos: Conflito[] };

export function tentarAdicionar(carrinho: TurmaOfertada[], nova: TurmaOfertada): Tentativa {
  if (carrinho.some((t) => idTurma(t) === idTurma(nova))) {
    return { ok: false, motivo: "JA_NO_CARRINHO", mensagem: `${nova.nome} já está no planejador.` };
  }

  const blocosNova = parseHorario(nova.horario);
  const conflitos: Conflito[] = [];
  for (const t of carrinho) {
    const comuns = blocosEmChoque(parseHorario(t.horario), blocosNova);
    if (comuns.length) conflitos.push({ com: t, blocos: comuns });
  }

  if (conflitos.length) {
    const mensagem = conflitos
      .map((c) => `Choque de horário com ${c.com.nome} (${descreverBlocos(c.blocos)})`)
      .join(". ");
    return { ok: false, motivo: "CHOQUE", mensagem, conflitos };
  }
  return { ok: true };
}

export function cargaHorariaTotal(carrinho: TurmaOfertada[], matriz: Matriz): number {
  return carrinho.reduce(
    (soma, t) => soma + (matriz.disciplinas.find((d) => d.codigo === t.codigo)?.ch ?? 0),
    0
  );
}
