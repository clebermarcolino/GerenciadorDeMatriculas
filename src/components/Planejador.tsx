import { useMemo, useState } from "react";
import { MATRIZ, ROTULO, type Contexto, type StatusElegibilidade } from "../engine/elegibilidade";
import { descreverBlocos, parseHorario, type Bloco } from "../engine/horario";
import { OFERTA, avaliarOferta, idTurma, type TurmaOfertada } from "../engine/oferta";
import { cargaHorariaTotal, tentarAdicionar } from "../engine/planejador";

const COR: Record<StatusElegibilidade, string> = {
  APTA: "bg-green-100 text-green-800",
  CONCLUIDA: "bg-gray-100 text-gray-700",
  EM_CURSAMENTO: "bg-blue-100 text-blue-800",
  PREREQ_FALTANTE: "bg-red-100 text-red-800",
  SEM_TURMA: "bg-orange-100 text-orange-800",
};

const DIAS = [2, 3, 4, 5, 6];
const NOME_DIA: Record<number, string> = { 2: "Seg", 3: "Ter", 4: "Qua", 5: "Qui", 6: "Sex" };
const LINHAS_GRADE: { turno: "M" | "T"; slot: number; hora: string }[] = [
  ...[1, 2, 3, 4, 5].map((slot) => ({ turno: "M" as const, slot, hora: `${6 + slot}h` })),
  ...[1, 2, 3, 4, 5].map((slot) => ({ turno: "T" as const, slot, hora: `${12 + slot}h` })),
];

export default function Planejador({ ctx }: { ctx: Contexto }) {
  const [carrinho, setCarrinho] = useState<TurmaOfertada[]>([]);
  const [alerta, setAlerta] = useState<string | null>(null);
  const [soAptas, setSoAptas] = useState(true);

  const avaliadas = useMemo(() => avaliarOferta(ctx), [ctx]);
  const visiveis = avaliadas.filter((a) => !soAptas || a.elegibilidade?.status === "APTA");

  function adicionar(t: TurmaOfertada) {
    const r = tentarAdicionar(carrinho, t);
    if (r.ok) {
      setCarrinho([...carrinho, t]);
      setAlerta(null);
    } else {
      setAlerta(r.mensagem);
    }
  }

  const remover = (t: TurmaOfertada) => {
    setCarrinho(carrinho.filter((x) => idTurma(x) !== idTurma(t)));
    setAlerta(null);
  };

  const ocupacao = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const t of carrinho) {
      for (const b of parseHorario(t.horario)) {
        const k = `${b.dia}-${b.turno}-${b.slot}`;
        m.set(k, [...(m.get(k) ?? []), t.nome]);
      }
    }
    return m;
  }, [carrinho]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold">Oferta do semestre {OFERTA.semestre ?? ""}</h2>
        <p className="text-xs text-gray-500">Fonte: {OFERTA.fonte}</p>
      </div>

      {alerta && (
        <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-700">
          {alerta}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={soAptas} onChange={(e) => setSoAptas(e.target.checked)} />
        Mostrar só disciplinas aptas ({avaliadas.filter((a) => a.elegibilidade?.status === "APTA").length} de{" "}
        {avaliadas.length})
      </label>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="p-2">Disciplina</th>
              <th className="p-2">Horário</th>
              <th className="p-2">Professor / Sala</th>
              <th className="p-2">Status</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map(({ turma, elegibilidade }) => {
              const noCarrinho = carrinho.some((c) => idTurma(c) === idTurma(turma));
              return (
                <tr key={idTurma(turma)} className="border-t align-top">
                  <td className="p-2">
                    <div>{turma.nome}</div>
                    <div className="font-mono text-xs text-gray-500">{turma.codigo ?? "sem código"}</div>
                  </td>
                  <td className="p-2">
                    <div className="font-mono text-xs">{turma.horario}</div>
                    <div className="text-xs text-gray-500">{descreverBlocos(parseHorario(turma.horario))}</div>
                  </td>
                  <td className="p-2 text-xs">
                    {turma.professores.join(", ") || "—"}
                    <div className="text-gray-500">{turma.salas.join(", ")}</div>
                  </td>
                  <td className="p-2">
                    {elegibilidade ? (
                      <>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${COR[elegibilidade.status]}`}>
                          {ROTULO[elegibilidade.status]}
                        </span>
                        {elegibilidade.faltantes.length > 0 && (
                          <div className="mt-1 text-xs text-red-700">
                            Falta: {elegibilidade.faltantes.map((f) => f.nome).join("; ")}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">Disciplina sem código na base</span>
                    )}
                  </td>
                  <td className="p-2">
                    {elegibilidade?.status === "APTA" &&
                      (noCarrinho ? (
                        <button
                          className="cursor-pointer rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-700"
                          onClick={() => remover(turma)}>
                          Remover
                        </button>
                      ) : (
                        <button
                          className="cursor-pointer rounded bg-gray-900 px-3 py-1 text-xs text-white"
                          onClick={() => adicionar(turma)}
                        >
                          Adicionar
                        </button>
                      ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">
          Meu planejador ({carrinho.length} disciplinas · {cargaHorariaTotal(carrinho, MATRIZ)}h)
        </h3>
        {carrinho.length === 0 ? (
          <p className="text-sm text-gray-500">Adicione disciplinas aptas para montar a grade.</p>
        ) : (
          <ul className="mb-3 text-sm">
            {carrinho.map((t) => (
              <li key={idTurma(t)} className="flex items-center gap-2">
                <span>{t.nome}</span>
                <span className="font-mono text-xs text-gray-500">{t.horario}</span>
                <button
                  className="cursor-pointer rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-700"
                  onClick={() => remover(t)}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="overflow-x-auto rounded border">
          <table className="w-full table-fixed text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="w-12 p-1"></th>
                {DIAS.map((d) => (
                  <th key={d} className="p-1">
                    {NOME_DIA[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LINHAS_GRADE.map(({ turno, slot, hora }) => (
                <tr key={`${turno}${slot}`} className="border-t">
                  <td className="p-1 text-gray-500">{hora}</td>
                  {DIAS.map((dia) => {
                    const b: Bloco = { dia, turno, slot };
                    const nomes = ocupacao.get(`${b.dia}-${b.turno}-${b.slot}`) ?? [];
                    return (
                      <td key={dia} className={`h-7 p-1 ${nomes.length ? "bg-green-50" : ""}`}>
                        {nomes.join(" / ")}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
