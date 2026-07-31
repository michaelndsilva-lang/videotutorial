import "server-only";
import { generateText, type ModelMessage } from "ai";

export type HistoricoMensagem = {
  remetente: "lead" | "agente";
  conteudo: string;
};

// Gera a resposta do agente para um lead no WhatsApp. O modelo roda via
// Vercel AI Gateway (string "provider/model", resolvida pelo provider global
// default do pacote `ai` usando AI_GATEWAY_API_KEY).
export async function gerarRespostaAgente({
  promptSistema,
  nomeAgente,
  historico,
  mensagemAtual,
}: {
  promptSistema: string;
  nomeAgente?: string | null;
  historico: HistoricoMensagem[];
  mensagemAtual: string;
}): Promise<string> {
  const messages: ModelMessage[] = [
    ...historico.map((m) => ({
      role: m.remetente === "lead" ? ("user" as const) : ("assistant" as const),
      content: m.conteudo,
    })),
    { role: "user", content: mensagemAtual },
  ];

  const system = nomeAgente
    ? `Seu nome nesta conversa é ${nomeAgente}. Apresente-se e se refira a si mesmo por esse nome quando fizer sentido.\n\n${promptSistema}`
    : promptSistema;

  const { text } = await generateText({
    model: process.env.AI_GATEWAY_MODEL ?? "anthropic/claude-haiku-4.5",
    system,
    messages,
  });

  return text;
}
