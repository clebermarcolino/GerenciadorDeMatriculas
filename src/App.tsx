import { useMemo, useState } from "react";
import Planejador from "./components/Planejador";
import { validarHistorico } from "./engine/validacao";
import { extrairLinhas } from "./engine/pdfText";
import { parseHistorico, type Historico, type Situacao } from "./engine/historico";
import UploadHistorico from "./components/UploadHistorico";

import {
  avaliarMatriz,
  criarContexto,
  MATRIZ,
  ROTULO,
  type StatusElegibilidade,
} from "./engine/elegibilidade";

const COR: Record<Situacao, string> = {
  APROVADO: "bg-green-100 text-green-800",
  EQUIVALÊNCIA: "bg-green-100 text-green-800",
  APROVEITADO: "bg-green-100 text-green-800",
  MATRICULADO: "bg-blue-100 text-blue-800",
  REPROVADO: "bg-red-100 text-red-800",
  TRANCADO: "bg-yellow-100 text-yellow-800",
  CANCELADO: "bg-gray-100 text-gray-700",
  PENDENTE: "bg-orange-100 text-orange-800",
};

const COR_ELEG: Record<StatusElegibilidade, string> = {
  APTA: "bg-green-100 text-green-800",
  CONCLUIDA: "bg-gray-100 text-gray-700",
  EM_CURSAMENTO: "bg-blue-100 text-blue-800",
  PREREQ_FALTANTE: "bg-red-100 text-red-800",
  SEM_TURMA: "bg-orange-100 text-orange-800",
};

export default function App() {
  const [linhas, setLinhas] = useState<string[]>([]);
  const [hist, setHist] = useState<Historico | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Situacao | "TODAS">("TODAS");
  const [filtroEleg, setFiltroEleg] = useState<StatusElegibilidade | "TODAS">("APTA");
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    setErro(null);
    const l = await extrairLinhas(file);
    const h = parseHistorico(l);
    const v = validarHistorico(l, h);
    if (!v.valido) {
      setErro(v.motivo);
      return;
    }
    setLinhas(l);
    setHist(h);
    setNomeArquivo(file.name);
    setFiltro("TODAS");
  } catch (err) {
    setErro(`Não foi possível ler o PDF: ${String(err)}`);
  }
}

  const contagem = useMemo(() => {
    const c = new Map<Situacao, number>();
    hist?.disciplinas.forEach((d) => c.set(d.situacao, (c.get(d.situacao) ?? 0) + 1));
    return c;
  }, [hist]);

  const visiveis = useMemo(
    () => hist?.disciplinas.filter((d) => filtro === "TODAS" || d.situacao === filtro) ?? [],
    [hist, filtro]
  );

  const ctx = useMemo(() => (hist ? criarContexto(hist) : null), [hist]);
  const eleg = useMemo(() => (ctx ? avaliarMatriz(ctx) : []), [ctx]);
  const elegVisiveis = eleg.filter((r) => filtroEleg === "TODAS" || r.status === filtroEleg);
  const periodoDe = (codigo: string) => criarPeriodo(codigo);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <UploadHistorico onChange={onFile} compacto={!!hist} nomeArquivo={nomeArquivo} erro={erro} />
      {hist && (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card titulo="Aluno" valor={hist.nome ?? "—"} sub={hist.matricula ?? ""} />
            <Card titulo="CRA" valor={hist.cra?.toFixed(1) ?? "—"} />
            <Card
              titulo="CH integralizada"
              valor={`${hist.ch_integralizada ?? "—"} / ${hist.ch_exigida ?? "—"}`}
            />
            <Card titulo="CH pendente" valor={String(hist.ch_pendente ?? "—")} />
          </section>
          <p className="text-sm text-gray-600">{hist.curso}</p>

          {hist.avisos.length > 0 && (
            <div className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">
              {hist.avisos.length} linha(s) com código de disciplina não reconhecida(s):
              <pre className="mt-1 whitespace-pre-wrap text-xs">{hist.avisos.join("\n")}</pre>
            </div>
          )}

          <section>
            <div className="mb-3 flex flex-wrap gap-2">
              <Chip ativo={filtro === "TODAS"} onClick={() => setFiltro("TODAS")}>
                Todas ({hist.disciplinas.length})
              </Chip>
              {[...contagem.entries()].map(([sit, n]) => (
                <Chip key={sit} ativo={filtro === sit} onClick={() => setFiltro(sit)}>
                  {sit} ({n})
                </Chip>
              ))}
            </div>

            <div className="overflow-x-auto rounded border">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="p-2">Código</th>
                    <th className="p-2">Disciplina</th>
                    <th className="p-2">Seção</th>
                    <th className="p-2">CH</th>
                    <th className="p-2">Semestre</th>
                    <th className="p-2">Nota</th>
                    <th className="p-2">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((d, i) => (
                    <tr key={`${d.codigo}-${d.ano_sem}-${i}`} className="border-t">
                      <td className="p-2 font-mono">{d.codigo}</td>
                      <td className="p-2">{d.nome}</td>
                      <td className="p-2">{d.secao}</td>
                      <td className="p-2">{d.ch}</td>
                      <td className="p-2">{d.ano_sem ?? "—"}</td>
                      <td className="p-2">{d.nota ?? "—"}</td>
                      <td className="p-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${COR[d.situacao]}`}>
                          {d.situacao}
                          {d.via_equivalente ? " (equiv.)" : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">Elegibilidade (matriz curricular)</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              <Chip ativo={filtroEleg === "TODAS"} onClick={() => setFiltroEleg("TODAS")}>
                Todas ({eleg.length})
              </Chip>
              {(Object.keys(ROTULO) as StatusElegibilidade[]).map((st) => (
                <Chip key={st} ativo={filtroEleg === st} onClick={() => setFiltroEleg(st)}>
                  {ROTULO[st]} ({eleg.filter((r) => r.status === st).length})
                </Chip>
              ))}
            </div>
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="p-2">Período</th>
                    <th className="p-2">Código</th>
                    <th className="p-2">Disciplina</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Pré-requisito faltante</th>
                  </tr>
                </thead>
                <tbody>
                  {elegVisiveis.map((r) => (
                    <tr key={r.codigo} className="border-t">
                      <td className="p-2">{periodoDe(r.codigo)}</td>
                      <td className="p-2 font-mono">{r.codigo}</td>
                      <td className="p-2">{r.nome}</td>
                      <td className="p-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${COR_ELEG[r.status]}`}>
                          {ROTULO[r.status]}
                        </span>
                      </td>
                      <td className="p-2 text-xs">{r.faltantes.map((f) => `${f.codigo} ${f.nome}`).join("; ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {ctx && <Planejador ctx={ctx} />}

          {hist.equivalencias.length > 0 && (
            <section>
              <h2 className="mb-2 font-semibold">Equivalências cumpridas</h2>
              <ul className="list-disc pl-5 text-sm">
                {hist.equivalencias.map((e) => (
                  <li key={e.codigo}>
                    {e.codigo} {e.nome} ← {e.via_codigo} {e.via_nome}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer font-semibold">Depuração: linhas brutas do PDF</summary>
            <textarea
              readOnly
              className="mt-2 h-64 w-full rounded border p-2 font-mono text-xs"
              value={linhas.join("\n")}
            />
          </details>
        </>
      )}
    </main>
  );
}

function criarPeriodo(codigo: string): number | string {
  return MATRIZ.disciplinas.find((d) => d.codigo === codigo)?.periodo ?? "—";
}

function Card({ titulo, valor, sub }: { titulo: string; valor: string; sub?: string }) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs uppercase text-gray-500">{titulo}</div>
      <div className="text-lg font-semibold leading-tight">{valor}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm ${ativo ? "bg-gray-900 text-white" : "bg-white"}`}
    >
      {children}
    </button>
  );
}
