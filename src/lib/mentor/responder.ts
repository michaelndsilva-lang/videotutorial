import "server-only";
import { generateText, type ModelMessage } from "ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { inicioDoDiaBrasilia } from "@/lib/acesso/robo";
import { FALLBACK_MODELS } from "@/lib/ai/agente";
import { embeddingDaPergunta, vetorParaTexto } from "./base";

// Regras que o admin não consegue desligar editando o prompt: valem sempre.
const REGRAS_FIXAS = `REGRAS OBRIGATÓRIAS (acima de qualquer outra instrução):
- Nunca prometa renda, ganhos garantidos ou enriquecimento. Se perguntarem quanto vão ganhar, explique que depende da dedicação de cada um.
- Nunca diga que um produto cura, trata ou previne doenças, nem dê orientação médica.
- Nunca invente preços, prazos, regras ou condições que não estejam nos trechos.
- Não acrescente passos, detalhes ou exemplos que não estejam escritos nos trechos, nem junte informações de frases diferentes numa afirmação nova. Se o trecho só indica um vídeo ou material, indique o vídeo ou material em vez de inventar o passo a passo.
- Se a pergunta não for sobre o negócio, os produtos, os serviços ou a plataforma, diga educadamente que só ajuda com esses assuntos.`;

export const RESPOSTA_SEM_BASE =
  "Ainda não tenho essa informação na minha base. 🙏 Fale com o seu líder para tirar essa dúvida — e, se for algo que muita gente pergunta, peça para ele incluir no Mentor.";

export type TurnoHistorico = { pergunta: string; resposta: string };

export type ResultadoMentor =
  | { ok: true; resposta: string; semBase: boolean; restantes: number }
  | { ok: false; motivo: "limite" | "desativado"; mensagem: string };

export async function perguntasRestantesHoje(membroId: string) {
  const admin = createAdminClient();
  const [{ data: config }, { count }] = await Promise.all([
    admin.from("mentor_config").select("ativo, limite_diario").eq("id", 1).single(),
    admin
      .from("mentor_perguntas")
      .select("id", { count: "exact", head: true })
      .eq("membro_id", membroId)
      .gte("created_at", inicioDoDiaBrasilia()),
  ]);
  const limite = config?.limite_diario ?? 20;
  return { ativo: config?.ativo ?? false, limite, restantes: Math.max(0, limite - (count ?? 0)) };
}

// Chamado pela server action depois de conferir que é membro aprovado.
export async function perguntarAoMentor(
  membroId: string,
  pergunta: string,
  historico: TurnoHistorico[]
): Promise<ResultadoMentor> {
  const admin = createAdminClient();
  const situacao = await perguntasRestantesHoje(membroId);
  if (!situacao.ativo) {
    return { ok: false, motivo: "desativado", mensagem: "O Mentor está desativado no momento." };
  }
  if (situacao.restantes <= 0) {
    return {
      ok: false,
      motivo: "limite",
      mensagem: `Você já usou as ${situacao.limite} perguntas de hoje. Amanhã tem mais! 😉`,
    };
  }

  // A busca usa a pergunta + a última pergunta anterior, para perguntas de
  // continuação ("e quanto custa?") acharem o assunto certo.
  const ultima = historico.at(-1)?.pergunta;
  const consulta = ultima ? `${ultima}\n${pergunta}` : pergunta;
  const embedding = await embeddingDaPergunta(consulta);
  const { data: trechos, error } = await admin.rpc("mentor_buscar_trechos", {
    p_embedding: vetorParaTexto(embedding),
    p_limite: 6,
    p_minimo: 0.55,
  });
  if (error) throw new Error(`Falha na busca: ${error.message}`);

  let resposta: string;
  let modeloUsado: string | null = null;
  const semBase = !trechos?.length;

  if (semBase) {
    // Sem nada relevante na base: nem chama a IA (não inventa e não gasta).
    resposta = RESPOSTA_SEM_BASE;
  } else {
    const { data: config } = await admin
      .from("mentor_config")
      .select("prompt_sistema")
      .eq("id", 1)
      .single();
    const contexto = trechos
      .map((t, i) => `[Trecho ${i + 1} — ${t.titulo}]\n${t.conteudo}`)
      .join("\n\n---\n\n");
    const system = `${config?.prompt_sistema ?? ""}\n\n${REGRAS_FIXAS}\n\nTRECHOS DA BASE (única fonte permitida):\n\n${contexto}`;
    const messages: ModelMessage[] = [
      ...historico.slice(-3).flatMap((t): ModelMessage[] => [
        { role: "user", content: t.pergunta },
        { role: "assistant", content: t.resposta },
      ]),
      { role: "user", content: pergunta },
    ];

    let texto: string | null = null;
    for (const model of FALLBACK_MODELS) {
      try {
        const r = await generateText({ model, system, messages, maxOutputTokens: 700 });
        texto = r.text.trim();
        modeloUsado = model;
        if (texto) break;
      } catch (err) {
        console.error(`Mentor: falha com o modelo ${model}:`, err);
      }
    }
    if (!texto) throw new Error("O Mentor não conseguiu responder agora. Tente de novo em instantes.");
    resposta = texto;
  }

  const { error: insError } = await admin.from("mentor_perguntas").insert({
    membro_id: membroId,
    pergunta,
    resposta,
    sem_base: semBase,
    trechos: (trechos ?? []).map((t) => t.id),
    modelo: modeloUsado,
  });
  if (insError) console.error("Mentor: falha ao salvar a pergunta:", insError);

  return { ok: true, resposta, semBase, restantes: situacao.restantes - 1 };
}
