"use server";

import { revalidatePath } from "next/cache";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export async function createCard(input: {
  colunaId: string;
  nomeLead: string;
  telefone?: string;
  observacoes?: string;
}) {
  await requireMembro();
  const supabase = await createClient();

  // O membro pode ter mais de um board (recrutamento / energia); a coluna já
  // identifica de forma única a qual board o novo card pertence.
  const { data: coluna } = await supabase
    .from("kanban_columns")
    .select("board_id")
    .eq("id", input.colunaId)
    .single();
  const boardId = coluna?.board_id;
  if (!boardId) throw new Error("Coluna não encontrada.");

  const { data: existing } = await supabase
    .from("kanban_cards")
    .select("posicao")
    .eq("coluna_id", input.colunaId)
    .order("posicao", { ascending: false })
    .limit(1);
  const nextPos = (existing?.[0]?.posicao ?? -1) + 1;

  const { error } = await supabase.from("kanban_cards").insert({
    board_id: boardId,
    coluna_id: input.colunaId,
    nome_lead: input.nomeLead,
    telefone: input.telefone || null,
    observacoes: input.observacoes || null,
    origem: "manual",
    posicao: nextPos,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/membro/kanban");
}

export async function updateCard(
  id: string,
  input: { nomeLead: string; telefone?: string; observacoes?: string }
) {
  await requireMembro();
  const supabase = await createClient();

  const { error } = await supabase
    .from("kanban_cards")
    .update({
      nome_lead: input.nomeLead,
      telefone: input.telefone || null,
      observacoes: input.observacoes || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/membro/kanban");
}

export async function deleteCard(id: string) {
  await requireMembro();
  const supabase = await createClient();

  const { error } = await supabase.from("kanban_cards").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/membro/kanban");
}

// Chamado no fim de um drag-and-drop com o estado final das colunas afetadas
// (origem e destino), pra persistir tanto a nova coluna quanto a ordem dos cards.
export async function persistBoardOrder(columns: { colunaId: string; cardIds: string[] }[]) {
  await requireMembro();
  const supabase = await createClient();

  for (const col of columns) {
    for (let i = 0; i < col.cardIds.length; i++) {
      const { error } = await supabase
        .from("kanban_cards")
        .update({ coluna_id: col.colunaId, posicao: i })
        .eq("id", col.cardIds[i]);
      if (error) throw new Error(error.message);
    }
  }

  revalidatePath("/membro/kanban");
}

export async function createColumn(boardId: string, nome: string) {
  await requireMembro();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("kanban_columns")
    .select("posicao")
    .eq("board_id", boardId)
    .order("posicao", { ascending: false })
    .limit(1);
  const nextPos = (existing?.[0]?.posicao ?? 0) + 1;

  const { error } = await supabase.from("kanban_columns").insert({
    board_id: boardId,
    nome,
    posicao: nextPos,
    is_padrao: false,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/membro/kanban");
}

export async function renameColumn(id: string, nome: string) {
  await requireMembro();
  const supabase = await createClient();

  const { error } = await supabase.from("kanban_columns").update({ nome }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/membro/kanban");
}

export async function deleteColumn(id: string) {
  await requireMembro();
  const supabase = await createClient();

  const { count } = await supabase
    .from("kanban_cards")
    .select("*", { count: "exact", head: true })
    .eq("coluna_id", id);

  if (count && count > 0) {
    throw new Error("Só é possível excluir colunas vazias. Mova ou apague os cards primeiro.");
  }

  const { error } = await supabase.from("kanban_columns").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/membro/kanban");
}
