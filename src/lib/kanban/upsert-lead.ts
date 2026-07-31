import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type AgenteModo = Database["public"]["Enums"]["agente_modo"];

export function normalizeTelefone(valor: string): string {
  return valor.replace(/\D/g, "");
}

// Chamado pelo webhook (client service-role) quando uma mensagem de lead chega
// via WhatsApp. Encontra um card existente pelo telefone normalizado no board
// do membro correspondente ao modo do agente ativo na conversa (recrutamento
// ou energia — cada um tem seu próprio board); se não achar, cria um novo na
// coluna de menor posição (proxy para "a primeira coluna", sem depender do
// nome exato, caso tenha sido renomeada).
export async function upsertLeadCard(
  supabase: SupabaseClient<Database>,
  params: { membroId: string; modo: AgenteModo; telefone: string; nomeLead: string }
): Promise<void> {
  const { data: board } = await supabase
    .from("kanban_boards")
    .select("id")
    .eq("membro_id", params.membroId)
    .eq("modo", params.modo)
    .single();
  if (!board) return;

  const telefoneNormalizado = normalizeTelefone(params.telefone);

  const { data: cards } = await supabase
    .from("kanban_cards")
    .select("id, telefone")
    .eq("board_id", board.id);

  const existe = (cards ?? []).some(
    (c) => c.telefone && normalizeTelefone(c.telefone) === telefoneNormalizado
  );
  if (existe) return;

  const { data: colunas } = await supabase
    .from("kanban_columns")
    .select("id, posicao")
    .eq("board_id", board.id)
    .order("posicao", { ascending: true })
    .limit(1);
  const colunaId = colunas?.[0]?.id;
  if (!colunaId) return;

  const { data: existing } = await supabase
    .from("kanban_cards")
    .select("posicao")
    .eq("coluna_id", colunaId)
    .order("posicao", { ascending: false })
    .limit(1);
  const nextPos = (existing?.[0]?.posicao ?? -1) + 1;

  await supabase.from("kanban_cards").insert({
    board_id: board.id,
    coluna_id: colunaId,
    nome_lead: params.nomeLead,
    telefone: params.telefone,
    origem: "agente_ia",
    posicao: nextPos,
  });
}
