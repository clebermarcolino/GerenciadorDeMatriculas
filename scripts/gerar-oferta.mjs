import fs from "node:fs";
import XLSX from "xlsx";

const [, , arquivo, abaArg = "SI Horário 2025.2", saida = "src/data/oferta.json"] = process.argv;
if (!arquivo) {
  console.error("Uso: node scripts/gerar-oferta.mjs <planilha.xlsx> [aba] [saida.json]");
  process.exit(1);
}

const aliases = JSON.parse(fs.readFileSync(new URL("./aliases-oferta.json", import.meta.url), "utf-8"));
const espacos = (s) => s.replace(/\s+/g, " ").trim();
const semAcento = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const normalizar = (s) =>
  espacos(semAcento(s).toUpperCase().replace(/\((C|OPTATIVA)\)/g, ""));

const wb = XLSX.readFile(arquivo);
const nomeAba = wb.SheetNames.find((n) => espacos(n) === espacos(abaArg));
if (!nomeAba) {
  console.error(`Aba "${abaArg}" não encontrada. Abas: ${wb.SheetNames.join(" | ")}`);
  process.exit(1);
}
const linhas = XLSX.utils.sheet_to_json(wb.Sheets[nomeAba], { header: 1, defval: null, raw: true });
const txt = (v) => (v == null ? "" : String(v));

function slotsDoBloco(rotulo) {
  const m = rotulo.match(/(\d{1,2}):\d{2}\s*-\s*(\d{1,2}):\d{2}/);
  if (!m) return null;
  const ini = Number(m[1]);
  const fim = Number(m[2]);
  if (ini < 12) return { turno: "M", slots: range(ini - 6, fim - 7) };
  if (ini < 18) return { turno: "T", slots: range(ini - 12, fim - 13) };
  return null;
}
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const semestre = linhas.slice(0, 12).map((l) => l.map(txt).join(" ")).join(" ").match(/(\d{4}\.\d)/)?.[1] ?? null;

const turmas = new Map();
const avisos = [];
let periodo = null;
let dias = {};

for (let i = 0; i < linhas.length; i++) {
  const l = linhas[i];
  const colB = txt(l[1]).trim();

  const mp = colB.match(/^P(\d)$/);
  if (mp) {
    periodo = Number(mp[1]);
    dias = {};
    for (let c = 2; c < l.length; c++) {
      const d = txt(l[c]).match(/\((\d)\)/);
      if (d) dias[c] = Number(d[1]);
    }
    continue;
  }

  const bloco = slotsDoBloco(colB);
  if (!bloco || periodo == null) continue;
  const prox = linhas[i + 1] ?? [];

  for (const [col, dia] of Object.entries(dias)) {
    const celula = txt(l[col]);
    if (!celula.trim()) continue;

    const nomes = celula.split(" / ").map(espacos).filter(Boolean);
    const [linhaProf = "", ...resto] = txt(prox[col]).split("\n").map(espacos).filter(Boolean);
    const profs = linhaProf.split("/").map(espacos);
    const salas = resto.join(" ").split("/").map(espacos).filter(Boolean);

    nomes.forEach((bruto, k) => {
      const chave = normalizar(bruto);
      const codigo = aliases[chave] ?? null;
      if (!codigo) avisos.push(`Sem código: "${espacos(bruto)}" (P${periodo})`);
      const id = codigo ?? `nome:${chave}`;

      if (!turmas.has(id)) {
        turmas.set(id, {
          codigo,
          nome: espacos(bruto.replace(/\((C|Optativa)\)/gi, "")),
          compartilhada: /\(C\)/i.test(bruto),
          optativa: /\(Optativa\)/i.test(bruto),
          periodo_grade: periodo,
          professores: new Set(),
          salas: new Set(),
          celulas: [],
        });
      }
      const t = turmas.get(id);
      const prof = profs.length === nomes.length ? profs[k] : profs.join(" / ");
      const sala = salas.length === nomes.length ? salas[k] : salas.join(" / ");
      if (prof) t.professores.add(prof);
      if (sala) t.salas.add(sala);
      for (const s of bloco.slots) t.celulas.push({ dia: Number(dia), turno: bloco.turno, slot: s });
    });
  }
}

function codigoHorario(celulas) {
  const porDiaTurno = new Map();
  for (const c of celulas) {
    const k = `${c.dia}|${c.turno}`;
    if (!porDiaTurno.has(k)) porDiaTurno.set(k, new Set());
    porDiaTurno.get(k).add(c.slot);
  }
  const grupos = new Map();
  for (const [k, slots] of porDiaTurno) {
    const [dia, turno] = k.split("|");
    const gk = `${turno}${[...slots].sort((a, b) => a - b).join("")}`;
    if (!grupos.has(gk)) grupos.set(gk, []);
    grupos.get(gk).push(Number(dia));
  }
  return [...grupos.entries()]
    .map(([gk, ds]) => ({ gk, dias: ds.sort((a, b) => a - b) }))
    .sort((a, b) => a.gk[0].localeCompare(b.gk[0]) || a.dias[0] - b.dias[0])
    .map(({ gk, dias: ds }) => `${ds.join("")}${gk}`)
    .join(" ");
}

function unirNomes(set) {
  const lista = [...set];
  return lista.filter(
    (p) => !lista.some((q) => q !== p && q.toLowerCase().startsWith(p.toLowerCase()))
  );
}

const lista = [...turmas.values()]
  .map((t) => ({
    codigo: t.codigo,
    nome: t.nome,
    compartilhada: t.compartilhada,
    optativa: t.optativa,
    periodo_grade: t.periodo_grade,
    professores: unirNomes(t.professores),
    salas: [...t.salas],
    horario: codigoHorario(t.celulas),
  }))
  .sort((a, b) => (a.codigo ?? "~").localeCompare(b.codigo ?? "~") || a.nome.localeCompare(b.nome));

fs.writeFileSync(
  saida,
  JSON.stringify({ semestre, fonte: `${nomeAba} (${arquivo.split("/").pop()})`, turmas: lista }, null, 2) + "\n"
);
console.log(`${lista.length} turmas gravadas em ${saida} (semestre ${semestre})`);
avisos.forEach((a) => console.warn("AVISO:", a));
