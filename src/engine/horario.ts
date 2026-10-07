export type Turno = "M" | "T" | "N";

export interface Bloco {
  dia: number;
  turno: Turno;
  slot: number;
}

const INICIO: Record<Turno, number> = { M: 7, T: 13, N: 18 };

const DIAS: Record<number, string> = {
  2: "Segunda",
  3: "Terça",
  4: "Quarta",
  5: "Quinta",
  6: "Sexta",
  7: "Sábado",
};

export function parseHorario(codigo: string): Bloco[] {
  const blocos: Bloco[] = [];
  const grupos = codigo.trim().toUpperCase().split(/\s+/);

  for (const g of grupos) {
    const m = g.match(/^([2-7]+)([MTN])([1-6]+)$/);
    if (!m) continue;
    const [, dias, turno, slots] = m;
    for (const d of dias) {
      for (const s of slots) {
        blocos.push({ dia: Number(d), turno: turno as Turno, slot: Number(s) });
      }
    }
  }
  return blocos;
}

export function horaInicio(b: Bloco): number {
  return INICIO[b.turno] + (b.slot - 1);
}

export function rotulo(b: Bloco): string {
  return `${DIAS[b.dia]} às ${horaInicio(b)}h`;
}

const chave = (b: Bloco) => `${b.dia}-${b.turno}-${b.slot}`;

export function blocosEmChoque(a: Bloco[], b: Bloco[]): Bloco[] {
  const set = new Set(a.map(chave));
  return b.filter((x) => set.has(chave(x)));
}

export function temChoque(a: Bloco[], b: Bloco[]): boolean {
  return blocosEmChoque(a, b).length > 0;
}

const ORDEM_TURNO: Record<Turno, number> = { M: 0, T: 1, N: 2 };

export function descreverBlocos(blocos: Bloco[]): string {
  const grupos = new Map<string, { dia: number; turno: Turno; slots: Set<number> }>();
  for (const b of blocos) {
    const k = `${b.dia}-${b.turno}`;
    if (!grupos.has(k)) grupos.set(k, { dia: b.dia, turno: b.turno, slots: new Set() });
    grupos.get(k)!.slots.add(b.slot);
  }
  const partes: string[] = [];
  const ordenados = [...grupos.values()].sort(
    (a, b) => a.dia - b.dia || ORDEM_TURNO[a.turno] - ORDEM_TURNO[b.turno]
  );
  for (const { dia, turno, slots } of ordenados) {
    const lista = [...slots].sort((a, b) => a - b);
    const fecha = (ini: number, fim: number) =>
      partes.push(
        `${DIAS[dia]} ${horaInicio({ dia, turno, slot: ini })}h–${horaInicio({ dia, turno, slot: fim }) + 1}h`
      );
    let ini = lista[0];
    let ant = ini;
    for (const s of lista.slice(1)) {
      if (s === ant + 1) ant = s;
      else {
        fecha(ini, ant);
        ini = ant = s;
      }
    }
    fecha(ini, ant);
  }
  return partes.join("; ");
}
