import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { inicioDoDiaBrasilia } from "@/lib/acesso/robo";
import { perguntasRestantesHoje } from "@/lib/mentor/responder";
import { MentorChat } from "./mentor-chat";

export const maxDuration = 60;

export default async function MembroMentorPage() {
  const user = await requireMembro();
  const supabase = await createClient();

  // Conversa de hoje (RLS: só as próprias perguntas).
  const [{ data: hoje }, situacao] = await Promise.all([
    supabase
      .from("mentor_perguntas")
      .select("pergunta, resposta, sem_base")
      .eq("membro_id", user.id)
      .gte("created_at", inicioDoDiaBrasilia())
      .order("created_at"),
    perguntasRestantesHoje(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Tire suas dúvidas"
        title="Mentor IA"
        description="Respostas com base nos materiais oficiais da equipe. Quando não souber, ele te avisa e indica falar com seu líder."
      />
      <MentorChat
        historicoInicial={(hoje ?? []).map((p) => ({
          pergunta: p.pergunta,
          resposta: p.resposta,
          semBase: p.sem_base,
        }))}
        restantesIniciais={situacao.restantes}
        limite={situacao.limite}
        ativo={situacao.ativo}
      />
    </div>
  );
}
