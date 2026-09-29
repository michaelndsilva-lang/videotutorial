import type { CatalogoTipo } from "@/lib/types/database.types";

// Catálogos em PDF do agente de recrutamento (migration 0024). Compartilhado
// entre browser (tela do admin) e servidor (webhook) — sem "server-only".
export const CATALOGOS_BUCKET = "catalogos";
// Teto de 50 MB por arquivo do Storage no plano free do Supabase (bucket em 50
// MB, migration 0025); 45 MB aqui deixa folga. O Guia de Produtos oficial tem
// ~38 MB e não comprime sem perder legibilidade.
export const CATALOGO_PDF_MAX_BYTES = 45 * 1024 * 1024;

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

// Frase em que o agente afirma que está enviando algo agora ("vou te mandar",
// "segue", "aqui está"...). Oferta em forma de pergunta não conta.
const PROMESSA_ENVIO =
  /\b(vou (te |lhe )?(enviar|mandar)|(te |lhe )?(envio|mando|enviei|mandei)|estou (te |lhe )?(enviando|mandando)|segue|seguem|aqui (est[aá]|vai))\b/i;

// Rede de segurança: o modelo às vezes escreve "vou te mandar o catálogo de
// perfumaria 👇" e esquece a marcação — o lead ficaria esperando um PDF que
// nunca chega. Só age sobre frases afirmativas que prometem o envio agora.
function catalogosPrometidos(texto: string): CatalogoTipo[] {
  const tipos = new Set<CatalogoTipo>();
  for (const frase of texto.match(/[^.!?\n]+[.!?]?/g) ?? []) {
    if (frase.trim().endsWith("?") || !PROMESSA_ENVIO.test(frase)) continue;
    const f = frase.toLowerCase();
    const perfumaria = /perfum|fragr[aâ]nci/.test(f);
    if (perfumaria) tipos.add("linha_perfumaria");
    if (/guia|cosm[eé]tic/.test(f) || (!perfumaria && /produtos/.test(f))) tipos.add("guia_produtos");
  }
  return [...tipos];
}

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

  if (escolhidos.length === 0) {
    for (const tipo of catalogosPrometidos(texto)) {
      const catalogo = catalogos.find((c) => c.tipo === tipo);
      if (catalogo) escolhidos.push(catalogo);
    }
  }

  return { texto, catalogos: escolhidos };
}
