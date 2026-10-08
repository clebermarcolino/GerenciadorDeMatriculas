import { useRef, useState } from "react";

interface Props {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  titulo?: string;
  compacto?: boolean;
  nomeArquivo?: string | null;
  erro?: string | null;
}

const PASSOS = [
  { n: "1", titulo: "Baixe seu histórico", texto: "No SIGAA, emita o Histórico em PDF." },
  { n: "2", titulo: "Envie o PDF aqui", texto: "Arraste o arquivo ou clique para selecionar." },
  { n: "3", titulo: "Veja suas opções", texto: "Confira as disciplinas aptas e monte sua grade de horários." },
];

export default function UploadHistorico({
  onChange,
  titulo = "Gerenciador de Matrículas",
  compacto = false,
  nomeArquivo = null,
  erro = null,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const mensagem = aviso ?? erro;

  function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    setAviso(null);
    onChange(e);
  }

  function aoSoltar(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setArrastando(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setAviso("Esse arquivo não é um PDF. Envie o Histórico em formato PDF.");
      return;
    }
    const input = inputRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    dt.items.add(f);
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const input = (
    <input
      ref={inputRef}
      id="upload-historico"
      type="file"
      accept="application/pdf,.pdf"
      className="sr-only"
      onChange={aoEscolher}
    />
  );

  if (compacto) {
    return (
      <div className="space-y-3 border-b border-black pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold">{titulo}</h1>
            <p className="truncate text-sm text-gray-600">
              Histórico carregado{nomeArquivo ? `: ${nomeArquivo}` : ""}
            </p>
          </div>
          <label
            htmlFor="upload-historico"
            className="cursor-pointer rounded-md border border-black px-4 py-2 text-sm font-medium transition hover:bg-black hover:text-white focus-within:ring-2 focus-within:ring-black focus-within:ring-offset-2"
          >
            Enviar outro histórico
            {input}
          </label>
        </div>
        {mensagem && (
          <p role="alert" className="rounded-md border border-red-600 p-3 text-sm font-medium text-red-600">
            {mensagem}
          </p>
        )}
      </div>
    );
  }

  return (
    <section aria-labelledby="titulo-app" className="space-y-8">
      <header className="space-y-2">
        <h1 id="titulo-app" className="text-3xl font-bold tracking-tight">
          {titulo}
        </h1>
        <p className="max-w-xl text-gray-600">
          Descubra quais disciplinas você pode cursar no próximo período e monte sua grade de horários sem
          choques.
        </p>
      </header>

      <ol className="grid gap-4 sm:grid-cols-3">
        {PASSOS.map((p) => (
          <li key={p.n} className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
              {p.n}
            </span>
            <div>
              <p className="font-semibold leading-snug">{p.titulo}</p>
              <p className="text-sm text-gray-600">{p.texto}</p>
            </div>
          </li>
        ))}
      </ol>

      <label
        htmlFor="upload-historico"
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={aoSoltar}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition focus-within:ring-2 focus-within:ring-black focus-within:ring-offset-2 ${
          arrastando ? "border-black bg-black text-white" : "border-gray-400 bg-white hover:border-black hover:bg-gray-50"
        }`}>
        <svg
          aria-hidden="true"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M12 16V4m0 0L8 8m4-4 4 4" />
          <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>
        <span className="text-lg font-semibold">
          {arrastando ? "Solte o arquivo para enviar" : "Arraste seu Histórico aqui"}
        </span>
        <span className="text-sm opacity-70">ou</span>
        <span
          className={`rounded-md px-5 py-2.5 text-sm font-medium ${
            arrastando ? "bg-white text-black" : "bg-black text-white"
          }`}>
          Selecionar arquivo PDF
        </span>
        <span className="text-xs opacity-70">Aceitamos apenas o PDF do Histórico emitido pelo SIGAA</span>
        {input}
      </label>

      {mensagem && (
        <p role="alert" className="rounded-md border border-red-600 p-3 text-sm font-medium text-red-600">
          {mensagem}
        </p>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer font-medium underline-offset-4 hover:underline">
          Onde encontro meu histórico?
        </summary>
        <p className="mt-2 text-gray-600">
          Entre no SIGAA, abra o Portal do Discente, vá em Ensino &rarr; Emitir Histórico e salve o PDF no
          seu computador.
        </p>
      </details>
    </section>
  );
}