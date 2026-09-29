import type { CatalogoTipo } from "@/lib/types/database.types";

// Catálogos em PDF do agente de recrutamento (migration 0024). Compartilhado
// entre browser (tela do admin) e servidor (webhook) — sem "server-only".
export const CATALOGOS_BUCKET = "catalogos";
export const CATALOGO_PDF_MAX_BYTES = 20 * 1024 * 1024;

export const CATALOGOS: Record<
  CatalogoTipo,
  { nome: string; tag: string; quando: string }
> = {
  linha_perfumaria: {
    nome: "LINHA DE PERFUMARIA",
    tag: "PERFUMARIA",
    quando:
      "o lead perguntar quais perfumes a Atlântica Natural tem, pedir a linha de perfumaria, catálogo de perfumes, fragrâncias ou algo semelhante",
  },
  guia_produtos: {
    nome: "GUIA DE PRODUTOS",
    tag: "PRODUTOS",
    quando:
      "o lead quiser saber sobre os outros produtos da Atlântica Natural além da perfumaria (cosméticos, cuidados, etc.), pedir o catálogo/guia de produtos ou algo semelhante",
  },
};

export const CATALOGO_TIPOS = Object.keys(CATALOGOS) as CatalogoTipo[];

export type CatalogoDisponivel = { tipo: CatalogoTipo; storage_path: string };

export function montarInstrucaoCatalogos(catalogos: CatalogoDisponivel[]): string | null {
  if (catalogos.length === 0) return null;

  const lista = catalogos
    .map(({ tipo }) => `- [[PDF:${CATALOGOS[tipo].tag}]] — "${CATALOGOS[tipo].nome}": enviar quando ${CATALOGOS[tipo].quando}.`)
    .join("\n");

  return `CATÁLOGOS EM PDF DISPONÍVEIS PARA ENVIAR AO LEAD:
${lista}

Quando o lead pedir um desses materiais (siga a indicação de cada um), escreva na sua resposta a marcação correspondente (ex.: [[PDF:${CATALOGOS[catalogos[0].tipo].tag}]]) — o sistema remove a marcação do texto e envia o PDF logo depois da sua mensagem. Regras:
- Envie o catálogo certo: perfumes → LINHA DE PERFUMARIA; demais produtos → GUIA DE PRODUTOS. Se o lead pedir os dois, use as duas marcações.
- Não reenvie um PDF que o histórico mostra que já foi enviado para este lead (aparece como "[PDF enviado: ...]"), a não ser que o lead peça de novo.
- Nunca invente uma marcação que não esteja na lista acima, e nunca escreva links — o envio é só pela marcação.
- Apresente o PDF com uma frase curta e natural (ex.: "Vou te mandar nosso catálogo aqui 👇") e, depois, retome a conversa normalmente.`;
}

const TAG_PDF = /\[\[\s*PDF\s*:\s*([A-ZÇÃÁÉÍÓÚ_ ]+?)\s*\]\]/gi;

// Separa as marcações de PDF do texto que vai para o lead.
export function extrairCatalogosDaResposta(
  resposta: string,
  catalogos: CatalogoDisponivel[]
): { texto: string; catalogos: CatalogoDisponivel[] } {
  const escolhidos: CatalogoDisponivel[] = [];
  for (const match of resposta.matchAll(TAG_PDF)) {
    const tag = match[1].trim().toUpperCase();
    const catalogo = catalogos.find((c) => CATALOGOS[c.tipo].tag === tag);
    if (catalogo && !escolhidos.includes(catalogo)) escolhidos.push(catalogo);
  }
  const texto = resposta.replace(TAG_PDF, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { texto, catalogos: escolhidos };
}
