import "server-only";
import { generateText } from "ai";
import { z } from "zod";
import type { FormatoConteudo } from "@/lib/types/database.types";

const variacaoReels = z.object({
  gancho: z.string(),
  desenvolvimento: z.string(),
  cta: z.string(),
  sugestao_visual: z.string(),
  duracao_estimada_seg: z.number(),
  legenda_curta: z.string(),
  hashtags: z.array(z.string()),
});

const variacaoLegendaPost = z.object({
  primeira_linha: z.string(),
  corpo: z.string(),
  cta: z.string(),
  hashtags: z.array(z.string()),
  sugestao_de_imagem: z.string(),
});

const variacaoStories = z.object({
  sequencia: z.array(
    z.object({
      tela: z.number(),
      texto: z.string(),
      acao_visual: z.string(),
      elemento_interativo: z.string(),
    })
  ),
  cta_final: z.string(),
});

const variacaoWhatsappProspeccao = z.object({
  contexto_de_uso: z.string(),
  mensagem_1: z.string(),
  mensagem_2: z.string(),
  pergunta_de_abertura: z.string(),
});

// Item único de cada formato — usado tanto pra tipar uma variação isolada
// (uma linha de conteudo_geracoes = uma variação, não o lote inteiro) quanto
// pra montar o schema do lote abaixo.
const VARIACAO_POR_FORMATO = {
  reels: variacaoReels,
  legenda_post: variacaoLegendaPost,
  stories: variacaoStories,
  whatsapp_prospeccao: variacaoWhatsappProspeccao,
} satisfies Record<FormatoConteudo, z.ZodType>;

export type VariacaoPorFormato = {
  [F in FormatoConteudo]: z.infer<(typeof VARIACAO_POR_FORMATO)[F]>;
};

// 3 variações por padrão (regra do prompt mestre, seção 5/6) — 1 quando é
// regeneração de uma variação isolada (ver `quantidade` em gerarConteudoIA).
function schemaDoLote(formato: FormatoConteudo, quantidade: number) {
  return z.object({ variacoes: z.array(VARIACAO_POR_FORMATO[formato]).length(quantidade) });
}

// Exemplo exato de shape que o modelo deve preencher — os valores literais
// aqui são só placeholders posicionais, não texto a copiar. Fica em código
// (não duplicado nas 16 linhas do banco) porque é fixo por formato,
// independente do objetivo ou dos templates que o admin edita.
const SCHEMA_EXEMPLO_POR_FORMATO: Record<FormatoConteudo, string> = {
  reels: `{"variacoes":[{"gancho":"","desenvolvimento":"","cta":"","sugestao_visual":"","duracao_estimada_seg":0,"legenda_curta":"","hashtags":[]}]}`,
  legenda_post: `{"variacoes":[{"primeira_linha":"","corpo":"","cta":"","hashtags":[],"sugestao_de_imagem":""}]}`,
  stories: `{"variacoes":[{"sequencia":[{"tela":1,"texto":"","acao_visual":"","elemento_interativo":""}],"cta_final":""}]}`,
  whatsapp_prospeccao: `{"variacoes":[{"contexto_de_uso":"","mensagem_1":"","mensagem_2":"","pergunta_de_abertura":""}]}`,
};

export type ResultadoLote<F extends FormatoConteudo> = { variacoes: VariacaoPorFormato[F][] };

class GeracaoInvalidaError extends Error {}

// Substitui {{chave}} pelos dados do perfil do membro. Placeholders sem valor
// viram um texto neutro em vez de vazar "{{cidade}}" literal pro prompt.
export function resolverPromptTemplate(template: string, vars: Record<string, string | null | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, chave: string) => {
    const valor = vars[chave];
    return valor && valor.trim() ? valor : "não informado";
  });
}

function extrairJson(texto: string): unknown {
  // O prompt instrui "sem crases, sem markdown", mas modelos às vezes
  // envolvem a resposta em ```json de qualquer forma — mesma defesa usada
  // em outras integrações de IA deste projeto (nunca confiar 100% na
  // obediência do modelo à instrução de formato).
  const semCrases = texto.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(semCrases);
}

export async function gerarConteudoIA<F extends FormatoConteudo>({
  systemPrompt,
  formato,
  modelo,
  quantidade = 3,
}: {
  systemPrompt: string;
  formato: F;
  modelo: string;
  // 1 quando é regeneração de uma única variação (o card "regenerar" na
  // tela de geração pede só aquela, não o lote de 3 inteiro de novo).
  quantidade?: number;
}): Promise<{ resultado: ResultadoLote<F>; tokensConsumidos: number }> {
  const schema = schemaDoLote(formato, quantidade);
  const instrucaoQuantidade =
    quantidade === 3
      ? ""
      : `\n\n---\n\nATENÇÃO: desta vez gere exatamente ${quantidade} variação(ões), não 3. Mantenha a mesma estrutura JSON, só com ${quantidade} item(ns) no array "variacoes".`;
  const system = `${systemPrompt}\n\n---\n\nSCHEMA EXATO DE SAÍDA (preencha os valores — isto é a estrutura, não texto para copiar):\n${SCHEMA_EXEMPLO_POR_FORMATO[formato]}${instrucaoQuantidade}`;
  type Mensagem = { role: "user" | "assistant"; content: string };
  const messages: Mensagem[] = [
    { role: "user", content: "Gere o conteúdo agora, seguindo todas as instruções acima." },
  ];

  let tokensConsumidos = 0;

  async function tentar(mensagens: Mensagem[]) {
    const { text, usage } = await generateText({ model: modelo, system, messages: mensagens });
    tokensConsumidos += usage.totalTokens ?? 0;
    return text;
  }

  const primeiraResposta = await tentar(messages);
  try {
    const resultado = schema.parse(extrairJson(primeiraResposta)) as ResultadoLote<F>;
    return { resultado, tokensConsumidos };
  } catch {
    // Uma única tentativa de correção automática (regra da seção 5 do
    // prompt mestre) — não repete indefinidamente.
  }

  const respostaCorrigida = await tentar([
    ...messages,
    { role: "assistant", content: primeiraResposta },
    {
      role: "user",
      content:
        "O JSON acima não é válido ou não segue exatamente o schema pedido. Responda de novo, agora só com o JSON corrigido, sem nenhum texto, comentário ou markdown fora dele.",
    },
  ]);

  try {
    const resultado = schema.parse(extrairJson(respostaCorrigida)) as ResultadoLote<F>;
    return { resultado, tokensConsumidos };
  } catch (err) {
    throw new GeracaoInvalidaError(
      `Modelo não retornou JSON válido após 1 tentativa de correção: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
