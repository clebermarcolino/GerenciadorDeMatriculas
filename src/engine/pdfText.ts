import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { agruparLinhas, type ItemPos } from "./linhas";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface PdfItem {
  str?: string;
  transform?: number[];
  width?: number;
}

export async function extrairLinhas(file: File): Promise<string[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const linhas: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const itens: ItemPos[] = (content.items as PdfItem[])
      .filter((i) => typeof i.str === "string" && i.transform)
      .map((i) => ({
        s: i.str as string,
        x: (i.transform as number[])[4],
        y: (i.transform as number[])[5],
        w: i.width ?? 0,
      }));
    linhas.push(...agruparLinhas(itens));
  }
  return linhas;
}
