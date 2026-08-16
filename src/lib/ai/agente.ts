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
  // situações (ex.: tutorial de primeiro pedido, pedido de catálogo). Sem a
  // ressalva abaixo, o forte reforço deste lembrete (repetido no final do
  // prompt) fazia o modelo confundir qualquer pedido "link-shaped" — vídeo
  // tutorial, catálogo — com pedido do link de cadastro, e mandar o link
  // errado no lugar do que o lead realmente pediu.
  const ressalvaOutrosLinks = `Esta instrução vale APENAS quando o lead demonstra interesse REAL em se cadastrar/se tornar consultor(a) da Atlantica Natural — por exemplo, quando ele pede explicitamente o "link de cadastro" ou "link de inscrição", diz que quer se cadastrar, quer virar consultor(a)/revendedor(a), ou pergunta como começar a vender. NÃO envie o link de cadastro por padrão só porque o lead mencionou a palavra "link" ou pediu algo relacionado ao negócio.

Em especial:
- Se o lead pedir o CATÁLOGO de produtos (quer ver produtos, preços, o que vocês vendem), envie o catálogo conforme instruído no prompt acima — NUNCA o link de cadastro.
- Se o prompt acima indicar vídeos tutoriais ou qualquer outra URL específica para outras situações (ex.: tutorial de como fazer o primeiro pedido), use a URL exata indicada para aquele caso — NÃO substitua pelo link de cadastro.
- Se não estiver claro se o lead quer se cadastrar ou só está pedindo informação/catálogo, NÃO envie o link de cadastro nesta resposta — responda a pergunta dele normalmente.`;

  // Contexto de data/hora: sem isso o modelo não tem noção de "hoje" e erra
  // sistematicamente ao calcular "amanhã", "depois de amanhã" ou o dia da
  // semana ao agendar reuniões. Testado na prática: só informar "hoje é
  // sábado, 15/08" NÃO basta — modelos mais fracos (ex.: fallback
  // gemini-2.5-flash-lite quando o modelo principal está indisponível)
  // seguem errando a aritmética de "+1 dia" e respondem um dia da semana
  // que não bate com a data (ex.: chamam 16/08/2026, que é domingo, de
  // "sexta-feira" — e ainda agendam reunião num domingo, o que o prompt
  // mestre proíbe). Por isso, em vez de pedir pro modelo somar dias de
  // cabeça, a tabela com hoje + os próximos dias já vem pronta calculada
  // no código (fuso de Brasília) — o modelo só precisa copiar da tabela,
  // nunca calcular.
  const agora = new Date();
  const fusoHorario = "America/Sao_Paulo";
  const hojeISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
  const hojeMeiaNoiteUTC = new Date(`${hojeISO}T00:00:00Z`);
  const rotulos = ["hoje", "amanhã", "depois de amanhã"];
  const formatadorDia = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const proximosDias = Array.from({ length: 7 }, (_, i) => {
    const data = new Date(hojeMeiaNoiteUTC.getTime() + i * 86_400_000);
    const formatada = formatadorDia.format(data);
    const rotulo = rotulos[i] ? ` (${rotulos[i]})` : "";
    return `- ${formatada}${rotulo}`;
  }).join("\n");
  const horaAtualFormatada = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fusoHorario,
    hour: "2-digit",
    minute: "2-digit",
  }).format(agora);
  const horaNumerica = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: fusoHorario, hour: "2-digit", hourCycle: "h23" }).format(agora)
  );
  const periodoDoDia =
    horaNumerica < 6
      ? "madrugada"
      : horaNumerica < 12
        ? "manhã"
        : horaNumerica < 18
          ? "tarde"
          : "noite";
  // Mesmo problema do "amanhã": sem isso o modelo também chuta o horário
  // atual (às vezes assume fuso do lead, ou um horário genérico tipo
  // "boa tarde" fora de hora). Toda a equipe e os leads operam em
  // horário de Brasília — nunca o fuso de onde o lead escreve.
  const instrucaoData = `Data e hora atuais (SEMPRE horário de Brasília, America/Sao_Paulo — nunca assuma outro fuso, mesmo que o lead pareça escrever de outra região): agora são ${horaAtualFormatada}, período da ${periodoDoDia}. Calendário dos próximos dias, já calculado — use exatamente estes dias da semana, NUNCA calcule por conta própria:
${proximosDias}

Sempre que for mencionar, sugerir ou confirmar QUALQUER data (ex.: "amanhã", "depois de amanhã", "sexta-feira que vem", agendar uma reunião, etc.), copie o dia da semana e a data diretamente da tabela acima em vez de fazer contas de cabeça. Nunca invente ou "chute" um dia da semana que não esteja na tabela. Lembre-se também da regra de agendamento do prompt acima (nunca aos domingos, se aplicável) ao escolher qual dia da tabela sugerir.

O mesmo vale para horário: use a hora atual acima como referência exata para expressões relativas de tempo (ex.: "daqui a pouco", "mais tarde", "hoje à noite", "bom dia"/"boa tarde"/"boa noite", "em quanto tempo você responde", horários de reunião). Não calcule de cabeça nem assuma um horário genérico — parta sempre de "${horaAtualFormatada}" (período da ${periodoDoDia}) em horário de Brasília. Se for saudar o lead, use a saudação compatível com o período atual (madrugada/manhã/tarde/noite) informado acima, não uma saudação genérica ou baseada em suposição.`;

  // Regra de engajamento: toda resposta ao lead deve terminar incentivando
  // ele a responder, para a conversa não morrer. Fica no código (não só no
  // prompt_sistema editável pelo admin) para valer sempre, independente do
  // que estiver configurado na tela de agentes.
  const instrucaoPerguntaProvocativa = `Termine TODA resposta a um lead com uma pergunta provocativa, curta e genuína, relacionada ao que acabou de ser conversado — o objetivo é estimular o lead a responder e manter a conversa em andamento. A pergunta deve soar natural, não robótica nem repetitiva de mensagem pra mensagem. Use bom senso: não force uma pergunta se ela soar deslocada (ex.: o lead pediu explicitamente para parar de falar, ou a resposta já termina em pergunta).`;

  const instrucaoLink = linkCadastro
    ? `Seu link de cadastro pessoal (use exatamente esta URL, sem alterar nenhum caractere, sempre que for enviar o "link de cadastro" ao lead):\n${linkCadastro}\n\nIMPORTANTE: qualquer URL diferente desta que apareça no histórico da conversa acima estava ERRADA — nunca repita um link diferente do especificado aqui. Além disso, o histórico usa o texto "${MARCADOR_LINK_REDIGIDO}" no lugar de links já enviados; isso é apenas uma nota interna sua, NUNCA copie esse texto entre parênteses pro lead — sempre escreva a URL completa acima quando for mencionar o link.\n\n${ressalvaOutrosLinks}`
    : `Seu link de cadastro pessoal ainda não foi configurado na plataforma. NUNCA invente, escreva um placeholder (como "[LINK AQUI]") ou um domínio/URL — mesmo que algo pareça ter sido enviado no histórico da conversa, não é um link real. Se o lead pedir o link de cadastro, diga que você vai confirmar esse link certinho com a equipe e já retorna — sem prometer um prazo específico.\n\n${ressalvaOutrosLinks}`;

  const system = [
    nomeAgente
      ? `Seu nome nesta conversa é ${nomeAgente}. Apresente-se e se refira a si mesmo por esse nome quando fizer sentido.\n\n${promptSistema}`
      : promptSistema,
    `---\n\n${instrucaoData}`,
    `---\n\n${instrucaoPerguntaProvocativa}`,
    `---\n\n${instrucaoLink}`,
    `---\n\nLembrete final antes de responder: ${instrucaoData}`,
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
