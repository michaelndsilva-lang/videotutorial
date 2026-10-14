import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "./kanban-board";
import { PainelHoje, type ItemHoje } from "./painel-hoje";
import { hojeBrasilia } from "@/lib/kanban/origem";
import type { Database } from "@/lib/types/database.types";

type AgenteModo = Database["public"]["Enums"]["agente_modo"];

const BOARD_TITLE: Record<AgenteModo, string> = {
  recrutamento: "Kanban leads recrutamento",
  energia: "Kanban leads energia por assinatura",
  sunne: "Kanban leads SUNNE",
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
      .select(
        "id, board_id, coluna_id, nome_lead, telefone, origem, observacoes, posicao, proximo_followup, movido_em"
      )
      .in("board_id", boardIds)
      .order("posicao"),
  ]);

  // Painel "Hoje": follow-ups vencidos/de hoje e leads parados (3 a 30 dias
  // sem trocar de coluna, sem follow-up, fora da última coluna do quadro).
  const hoje = hojeBrasilia();
  const quadroPorBoard = new Map(boards.map((b) => [b.id, BOARD_TITLE[b.modo].replace("Kanban leads ", "")]));
  const colunaPorId = new Map((columns ?? []).map((c) => [c.id, c]));
  const ultimaColunaPorBoard = new Map<string, string>();
  for (const c of columns ?? []) {
    const atual = ultimaColunaPorBoard.get(c.board_id);
    if (!atual || (colunaPorId.get(atual)?.posicao ?? -1) < c.posicao) ultimaColunaPorBoard.set(c.board_id, c.id);
  }
  const agora = new Date().getTime();
  const DIA = 24 * 60 * 60 * 1000;
  const paraItem = (c: NonNullable<typeof cards>[number]): ItemHoje => ({
    id: c.id,
    nome: c.nome_lead,
    telefone: c.telefone,
    quadro: quadroPorBoard.get(c.board_id) ?? "",
    coluna: colunaPorId.get(c.coluna_id)?.nome ?? "",
    followup: c.proximo_followup,
    diasParado: Math.floor((agora - new Date(c.movido_em).getTime()) / DIA),
  });
  const followups = (cards ?? [])
    .filter((c) => c.proximo_followup && c.proximo_followup <= hoje)
    .sort((a, b) => (a.proximo_followup ?? "").localeCompare(b.proximo_followup ?? ""))
    .map(paraItem);
  const todosParados = (cards ?? [])
    .map(paraItem)
    .filter(
      (i, idx) =>
        !i.followup &&
        i.diasParado >= 3 &&
        i.diasParado <= 30 &&
        (cards ?? [])[idx].coluna_id !== ultimaColunaPorBoard.get((cards ?? [])[idx].board_id)
    )
    .sort((a, b) => a.diasParado - b.diasParado);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Pipeline"
        title="Kanban de leads"
        description="Arraste os cards entre as etapas para acompanhar seu funil."
      />

      <PainelHoje followups={followups} parados={todosParados.slice(0, 10)} totalParados={todosParados.length} />

      {boards.map((board) => (
        <div key={board.id} className="flex min-h-0 flex-1 flex-col gap-3">
          <h2 className="font-heading text-lg font-medium text-foreground">
            {BOARD_TITLE[board.modo]}
          </h2>
          <MetricasQuadro
            colunas={(columns ?? []).filter((c) => c.board_id === board.id)}
            cards={(cards ?? []).filter((c) => c.board_id === board.id)}
          />
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

// Conversão por coluna: quantos leads chegaram pelo menos até cada etapa
// (cumulativo da etapa em diante), em % do total do quadro.
function MetricasQuadro({
  colunas,
  cards,
}: {
  colunas: { id: string; nome: string; posicao: number }[];
  cards: { coluna_id: string }[];
}) {
  if (cards.length === 0) return null;
  const ordenadas = [...colunas].sort((a, b) => a.posicao - b.posicao);
  const porColuna = ordenadas.map((c) => cards.filter((x) => x.coluna_id === c.id).length);
  return (
    <details className="rounded-lg border px-3 py-2 text-sm">
      <summary className="cursor-pointer text-muted-foreground">Métricas do quadro ({cards.length} leads)</summary>
      <ul className="mt-2 flex flex-col gap-1.5">
        {ordenadas.map((c, i) => {
          const chegaram = porColuna.slice(i).reduce((t, n) => t + n, 0);
          const pct = Math.round((chegaram / cards.length) * 100);
          return (
            <li key={c.id} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate">{c.nome}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-28 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {porColuna[i]} aqui · {pct}% chegaram
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
