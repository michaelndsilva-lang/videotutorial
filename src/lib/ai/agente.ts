import "server-only";
import { generateText, type ModelMessage } from "ai";

export type HistoricoMensagem = {
  remetente: "lead" | "agente";
  conteudo: string;
};

// Modelos alternativos confirmados funcionando no tier gratuito do AI
// Gateway (testado via gateway.getAvailableModels() em 2026-07-30). Cada
// provider tem seu próprio limite de rate limit — se vários leads escrevem
// ao mesmo tempo e o modelo principal está rate-limited (429), caímos pro
// próximo em vez de derrubar a conversa inteira. AI_GATEWAY_MODEL sempre
// entra primeiro na lista.
const FALLBACK_MODELS = Array.from(
  new Set(
    [
      process.env.AI_GATEWAY_MODEL,
      "google/gemini-2.5-flash-lite",
      "openai/gpt-4.1-mini",
      "meta/llama-3.1-8b",
      "amazon/nova-micro",
    ].filter((m): m is string => Boolean(m))
  )
);

// Gera a resposta do agente para um lead no WhatsApp. O modelo roda via
// Vercel AI Gateway (string "provider/model", resolvida pelo provider global
// default do pacote `ai` usando AI_GATEWAY_API_KEY).
export async function gerarRespostaAgente({
  promptSistema,
  nomeAgente,
  linkCadastro,
  historico,
  mensagemAtual,
}: {
  promptSistema: string;
  nomeAgente?: string | null;
  // Link de cadastro/referral pessoal do membro (link_recrutamento ou
  // link_energia, conforme o modo). Pode não estar configurado ainda.
  linkCadastro?: string | null;
  historico: HistoricoMensagem[];
  mensagemAtual: string;
}): Promise<string> {
  // Redige URLs de mensagens antigas do próprio agente: já vimos o modelo
  // "ancorar" num link errado do histórico e repeti-lo mesmo com instrução
  // explícita em contrário (inclusive um link inventado que o lead "confirmou"
  // ter recebido). Sem a URL literal no contexto, não tem o que repetir — o
  // texto ao redor ainda deixa claro que um link já foi enviado antes.
  const URL_REGEX = /https?:\/\/\S+/g;
  const MARCADOR_LINK_REDIGIDO = "(um link foi enviado aqui, mas seu conteúdo exato foi omitido deste histórico)";
  const messages: ModelMessage[] = [
    ...historico.map((m) => ({
      role: m.remetente === "lead" ? ("user" as const) : ("assistant" as const),
      content:
        m.remetente === "agente"
          ? m.conteudo.replace(URL_REGEX, MARCADOR_LINK_REDIGIDO)
          : m.conteudo,
    })),
    { role: "user", content: mensagemAtual },
  ];

  // O prompt mestre instrui "enviar o link de cadastro" sem nunca dizer qual
  // é — sem essa injeção o modelo inventa um placeholder tipo "[LINK AQUI]"
  // ou, pior, um domínio plausível mas falso (já aconteceu: o modelo inventou
  // "atlanticnatural.com.br" em vez do domínio real "atlanticanatural.com.br").
  // Uma instrução no início do system prompt não é suficiente: se um link
  // errado já apareceu no histórico da conversa e o lead "confirmou" que
  // funcionou, o modelo tende a repetir esse link errado por causa do
  // contexto anterior. Por isso a instrução também é repetida no FINAL do
  // system prompt (mensagens/instruções recentes pesam mais na geração) e
  // invalida explicitamente qualquer link diferente visto no histórico.
  // Esta instrução é só sobre o link de cadastro/referral pessoal — o prompt
  // mestre também manda vídeos tutoriais e links de catálogo em outras
  // situações (ex.: tutorial de primeiro pedido). Sem a ressalva abaixo, o
  // forte reforço deste lembrete (repetido no final do prompt) fazia o
  // modelo confundir pedidos de "vídeo/tutorial" com pedido do link de
  // cadastro e mandar o link errado no lugar do vídeo.
  const ressalvaOutrosLinks = `Esta instrução vale APENAS para quando o lead pedir o "link de cadastro" (o link de inscrição/referral pessoal para se tornar consultor). Se o prompt acima indicar vídeos tutoriais, links de catálogo ou qualquer outra URL específica para outras situações (ex.: tutorial de como fazer o primeiro pedido), use a URL exata indicada para aquele caso — NÃO substitua por este link de cadastro.`;

  const instrucaoLink = linkCadastro
    ? `Seu link de cadastro pessoal (use exatamente esta URL, sem alterar nenhum caractere, sempre que for enviar o "link de cadastro" ao lead):\n${linkCadastro}\n\nIMPORTANTE: qualquer URL diferente desta que apareça no histórico da conversa acima estava ERRADA — nunca repita um link diferente do especificado aqui. Além disso, o histórico usa o texto "${MARCADOR_LINK_REDIGIDO}" no lugar de links já enviados; isso é apenas uma nota interna sua, NUNCA copie esse texto entre parênteses pro lead — sempre escreva a URL completa acima quando for mencionar o link.\n\n${ressalvaOutrosLinks}`
    : `Seu link de cadastro pessoal ainda não foi configurado na plataforma. NUNCA invente, escreva um placeholder (como "[LINK AQUI]") ou um domínio/URL — mesmo que algo pareça ter sido enviado no histórico da conversa, não é um link real. Se o lead pedir o link de cadastro, diga que você vai confirmar esse link certinho com a equipe e já retorna — sem prometer um prazo específico.\n\n${ressalvaOutrosLinks}`;

  const system = [
    nomeAgente
      ? `Seu nome nesta conversa é ${nomeAgente}. Apresente-se e se refira a si mesmo por esse nome quando fizer sentido.\n\n${promptSistema}`
      : promptSistema,
    `---\n\n${instrucaoLink}`,
    `---\n\nLembrete final antes de responder: ${instrucaoLink}`,
  ].join("\n\n");

  // Instrução no prompt não é confiável o bastante sozinha — já vimos o
  // modelo copiar o marcador de redação literalmente pro lead mesmo com
  // instrução explícita em contrário. Correção determinística por cima:
  // se o marcador vazar na resposta, o próprio código substitui pelo link
  // real (ou remove, se não houver link configurado), sem depender do
  // modelo "obedecer".
  function corrigirVazamentoDoMarcador(text: string): string {
    if (!text.includes(MARCADOR_LINK_REDIGIDO)) return text;
    return text.split(MARCADOR_LINK_REDIGIDO).join(linkCadastro || "");
  }

  let ultimoErro: unknown;
  for (const model of FALLBACK_MODELS) {
    try {
      const { text } = await generateText({ model, system, messages });
      return corrigirVazamentoDoMarcador(text);
    } catch (err) {
      ultimoErro = err;
      console.error(`Falha ao gerar resposta com o modelo ${model}:`, err);
    }
  }

  throw ultimoErro;
}
