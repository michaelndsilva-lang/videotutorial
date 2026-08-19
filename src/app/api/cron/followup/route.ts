import { createAdminClient } from "@/lib/supabase/admin";
import { sendEvolutionText } from "@/lib/evolution/client";

export const maxDuration = 60;

// Disparado pelo Vercel Cron (ver vercel.json). Para cada conversa em que o
// lead ficou 3+ horas sem responder à última mensagem do agente, envia a
// mensagem de follow-up configurada em /admin/agentes para o modo daquele
// membro. `agente_conversas_aguardando_followup` (migration 0010) já garante
// que cada conversa só aparece uma vez até o lead responder de novo.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: conversas, error } = await supabase.rpc(
    "agente_conversas_aguardando_followup"
  );

  if (error) {
    console.error("Erro buscando conversas pendentes de follow-up:", error);
    return Response.json({ ok: false }, { status: 500 });
  }

  let enviados = 0;

  for (const conversa of conversas ?? []) {
    try {
      const { data: membro } = await supabase
        .from("membros")
        .select("modo_agente_ativo")
        .eq("usuario_id", conversa.membro_id)
        .single();
      const modo = membro?.modo_agente_ativo ?? "recrutamento";

      const { data: config } = await supabase
        .from("agentes_config")
        .select("prompt_followup")
        .eq("modo", modo)
        .single();
      const mensagem = config?.prompt_followup?.trim();
      if (!mensagem) continue; // sem follow-up configurado para este modo

      // No modo energia, um lead "aguardando_analise" está pausado esperando
      // avaliação manual do membro — um follow-up automático aqui contradiria
      // exatamente esse silêncio (ver webhook de mensagens do WhatsApp).
      if (modo === "energia") {
        const { data: leadState } = await supabase
          .from("energia_leads")
          .select("etapa")
          .eq("membro_id", conversa.membro_id)
          .eq("telefone_lead", conversa.telefone_lead)
          .maybeSingle();
        if (leadState?.etapa === "aguardando_analise") continue;
      }

      const { data: session } = await supabase
        .from("whatsapp_sessions")
        .select("instance_name, status")
        .eq("membro_id", conversa.membro_id)
        .single();
      if (!session?.instance_name || session.status !== "conectado") continue;

      await sendEvolutionText(session.instance_name, conversa.telefone_lead, mensagem);

      await supabase.from("agente_mensagens").insert({
        membro_id: conversa.membro_id,
        telefone_lead: conversa.telefone_lead,
        remetente: "agente",
        conteudo: mensagem,
        is_followup: true,
      });

      enviados++;
    } catch (err) {
      console.error(`Erro enviando follow-up para ${conversa.telefone_lead}:`, err);
    }
  }

  return Response.json({ ok: true, enviados });
}
