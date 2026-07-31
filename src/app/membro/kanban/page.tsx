import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "./kanban-board";
import type { Database } from "@/lib/types/database.types";

type AgenteModo = Database["public"]["Enums"]["agente_modo"];

const BOARD_TITLE: Record<AgenteModo, string> = {
  recrutamento: "Kanban leads recrutamento",
  energia: "Kanban leads energia por assinatura",
};

export default async function MembroKanbanPage() {
  const user = await requireMembro();
  const supabase = await createClient();

  const { data: boards } = await supabase
    .from("kanban_boards")
    .select("id, modo")
    .eq("membro_id", user.id)
    .order("modo");

  if (!boards || boards.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Pipeline" title="Kanban" />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quadro não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Fale com o administrador — algo deu errado na criação do seu quadro.
          </CardContent>
        </Card>
      </div>
    );
  }

  const boardIds = boards.map((b) => b.id);

  const [{ data: columns }, { data: cards }] = await Promise.all([
    supabase
      .from("kanban_columns")
      .select("id, board_id, nome, posicao, is_padrao")
      .in("board_id", boardIds)
      .order("posicao"),
    supabase
      .from("kanban_cards")
      .select("id, board_id, coluna_id, nome_lead, telefone, origem, observacoes, posicao")
      .in("board_id", boardIds)
      .order("posicao"),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Pipeline"
        title="Kanban de leads"
        description="Arraste os cards entre as etapas para acompanhar seu funil."
      />

      {boards.map((board) => (
        <div key={board.id} className="flex min-h-0 flex-1 flex-col gap-3">
          <h2 className="font-heading text-lg font-medium text-foreground">
            {BOARD_TITLE[board.modo]}
          </h2>
          <KanbanBoard
            boardId={board.id}
            columns={(columns ?? []).filter((c) => c.board_id === board.id)}
            cards={(cards ?? []).filter((c) => c.board_id === board.id)}
          />
        </div>
      ))}
    </div>
  );
}
