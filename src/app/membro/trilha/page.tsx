import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { TrilhaView, type MissaoView } from "./trilha-view";
import type { TipoTarefa } from "@/lib/types/database.types";

export default async function MembroTrilhaPage() {
  const user = await requireMembro();
  const supabase = await createClient();

  // RLS: só missões ativas, e só o progresso do próprio membro.
  const [{ data: missoes }, { data: progresso }] = await Promise.all([
    supabase
      .from("missoes")
      .select("id, dia, ordem, titulo, descricao, video_url, tipo_tarefa")
      .order("dia")
      .order("ordem"),
    supabase.from("missao_progresso").select("missao_id, resposta").eq("membro_id", user.id),
  ]);

  const lista: MissaoView[] = (missoes ?? []).map((m) => ({
    id: m.id,
    dia: m.dia,
    ordem: m.ordem,
    titulo: m.titulo,
    descricao: m.descricao,
    videoUrl: m.video_url,
    tipo: m.tipo_tarefa as TipoTarefa,
  }));
  const idsAtivos = new Set(lista.map((m) => m.id));
  const respostas = Object.fromEntries(
    (progresso ?? []).filter((p) => idsAtivos.has(p.missao_id)).map((p) => [p.missao_id, p.resposta])
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Comece por aqui"
        title="Primeiros 7 dias"
        description="Uma missão de cada vez. Cada dia libera quando você conclui o anterior."
      />
      {lista.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">A trilha ainda está sendo preparada</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Assim que o administrador liberar as missões, elas aparecem aqui.
          </CardContent>
        </Card>
      ) : (
        <TrilhaView missoes={lista} respostas={respostas} />
      )}
    </div>
  );
}
