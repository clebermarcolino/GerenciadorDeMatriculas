export interface ItemPos {
  s: string; 
  x: number;
  y: number; 
  w: number;
}

const TOL_Y = 3;
const GAP_ESPACO = 1.5;

export function agruparLinhas(itens: ItemPos[]): string[] {
  const validos = itens.filter((i) => i.s.trim() !== "");
  const ordenados = [...validos].sort((a, b) => b.y - a.y || a.x - b.x);

  const grupos: ItemPos[][] = [];
  let atual: ItemPos[] = [];
  let yRef = Infinity;

  for (const it of ordenados) {
    if (Math.abs(it.y - yRef) > TOL_Y) {
      if (atual.length) grupos.push(atual);
      atual = [];
      yRef = it.y;
    }
    atual.push(it);
  }
  if (atual.length) grupos.push(atual);

  return grupos
    .map((g) => {
      g.sort((a, b) => a.x - b.x);
      let texto = "";
      let fimAnterior = -Infinity;
      let anterior = "";
      for (const it of g) {
        const precisaEspaco =
          texto !== "" &&
          (it.x - fimAnterior > GAP_ESPACO || /\s$/.test(anterior) || /^\s/.test(it.s));
        texto += (precisaEspaco ? " " : "") + it.s;
        fimAnterior = it.x + it.w;
        anterior = it.s;
      }
      return texto.replace(/\s+/g, " ").trim();
    })
    .filter(Boolean);
}
