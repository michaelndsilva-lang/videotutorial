"use server";

import { revalidatePath } from "next/cache";
import { requireMembroAprovado } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

// A policy de insert (migration 0031) é quem garante dia liberado, missão
// ativa e resposta obrigatória — aqui só traduzimos o erro.
export async function concluirMissao(missaoId: string, resposta?: string) {
  const user = await requireMembroAprovado();
  const texto = resposta?.trim() || null;
  if (texto && texto.length > 2000) throw new Error("A resposta pode ter até 2000 caracteres.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("missao_progresso")
    .insert({ membro_id: user.id, missao_id: missaoId, resposta: texto });
  if (error) {
    if (error.code === "23505") return; // já concluída (clique duplo)
    if (error.message.includes("row-level security")) {
      throw new Error("Essa missão ainda não está liberada ou precisa de uma resposta.");
    }
    throw new Error(`Não foi possível concluir: ${error.message}`);
  }

  revalidatePath("/membro/trilha");
  revalidatePath("/membro/dashboard");
}

export async function desmarcarMissao(missaoId: string) {
  const user = await requireMembroAprovado();
  const supabase = await createClient();
  const { error } = await supabase
    .from("missao_progresso")
    .delete()
    .eq("membro_id", user.id)
    .eq("missao_id", missaoId);
  if (error) throw new Error(`Não foi possível desmarcar: ${error.message}`);

  revalidatePath("/membro/trilha");
  revalidatePath("/membro/dashboard");
}
