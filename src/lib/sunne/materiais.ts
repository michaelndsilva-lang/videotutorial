import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

export { SUNNE_BUCKET, SUNNE_PDF_MAX_BYTES, SUNNE_VIDEO_MAX_BYTES } from "./limites";

// Teto do texto de conhecimento que entra no system prompt. Os modelos de
// fallback menores (llama-3.1-8b, nova-micro) têm janela de ~128k tokens —
// 120 mil caracteres (~30-40k tokens) deixa folga para prompt + histórico.
const LIMITE_TOTAL_CONHECIMENTO = 120_000;

export async function extrairTextoPdf(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

type MaterialPdf = { titulo: string; conteudo_texto: string | null };
export type VideoCatalogo = { id: string; titulo: string; descricao: string; storage_path: string; mime_type: string };

// Base de conhecimento montada a partir dos PDFs anexados. Quando o total
// passa do teto, cada PDF é truncado proporcionalmente em vez de simplesmente
// descartar os últimos.
export function montarBaseConhecimento(pdfs: MaterialPdf[]): string | null {
  const comTexto = pdfs.filter((p) => p.conteudo_texto?.trim());
  if (comTexto.length === 0) return null;

  const cotaPorPdf = Math.floor(LIMITE_TOTAL_CONHECIMENTO / comTexto.length);
  const blocos = comTexto.map((p) => {
    const texto = p.conteudo_texto!.trim();
    const cortado = texto.length > cotaPorPdf ? `${texto.slice(0, cotaPorPdf)}\n[...trecho final omitido]` : texto;
    return `### Material: ${p.titulo}\n${cortado}`;
  });

  return `BASE DE CONHECIMENTO — materiais oficiais anexados pelo seu consultor. Use estas informações como fonte de verdade para responder dúvidas do lead (produtos, valores, regras, processos). Se algo não estiver aqui nem no prompt acima, não invente: diga que vai confirmar e retorna. Nunca mencione que existe um "PDF" ou "base de conhecimento" — fale naturalmente, como quem conhece o assunto.

${blocos.join("\n\n")}`;
}

// Os vídeos são referenciados pelo modelo por um código curto (V1, V2...) em
// vez do uuid — modelos menores erram/embaralham ids longos.
export function codigoVideo(indice: number): string {
  return `V${indice + 1}`;
}

export function montarInstrucaoVideos(videos: VideoCatalogo[]): string | null {
  if (videos.length === 0) return null;

  const lista = videos
    .map((v, i) => `- ${codigoVideo(i)} — "${v.titulo}"${v.descricao ? `: enviar quando ${v.descricao}` : ""}`)
    .join("\n");

  return `VÍDEOS CURTOS DISPONÍVEIS PARA ENVIAR AO LEAD:
${lista}

Quando fizer sentido enviar um desses vídeos (siga a indicação de cada um), escreva na sua resposta a marcação [[VIDEO:Vn]] (ex.: [[VIDEO:V1]]) — o sistema remove a marcação do texto e envia o vídeo logo depois da sua mensagem. Regras:
- Use no máximo UM vídeo por resposta.
- Não reenvie um vídeo que o histórico mostra que já foi enviado para este lead (aparece como "[vídeo enviado: ...]"), a não ser que o lead peça de novo.
- Nunca invente um código que não esteja na lista acima, e nunca escreva links de vídeo — o envio é só pela marcação.
- Apresente o vídeo com uma frase curta e natural (ex.: "Vou te mandar um vídeo rapidinho que explica melhor 👇").`;
}

const TAG_VIDEO = /\[\[\s*VIDEO\s*:\s*V?(\d+)\s*\]\]/gi;

// Separa as marcações de vídeo do texto que vai para o lead.
export function extrairVideosDaResposta(
  resposta: string,
  videos: VideoCatalogo[]
): { texto: string; videos: VideoCatalogo[] } {
  const escolhidos: VideoCatalogo[] = [];
  for (const match of resposta.matchAll(TAG_VIDEO)) {
    const video = videos[Number(match[1]) - 1];
    if (video && !escolhidos.includes(video)) escolhidos.push(video);
  }
  const texto = resposta.replace(TAG_VIDEO, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { texto, videos: escolhidos.slice(0, 1) };
}
