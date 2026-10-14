"use server";

import { revalidatePath } from "next/cache";
import { requireMembroAprovado } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

// RLS (migration 0032) garante membro aprovado e aula/curso ativos.
export async function concluirAula(aulaId: string) {
  const user = await requireMembroAprovado();
  const supabase = await createClient();
  const { error } = await supabase
    .from("aula_progresso")
    .insert({ membro_id: user.id, aula_id: aulaId });
  if (error && error.code !== "23505") {
    throw new Error(`Não foi possível marcar a aula: ${error.message}`);
  }
  revalidatePath("/membro/treinamentos", "layout");
}

export async function desmarcarAula(aulaId: string) {
  const user = await requireMembroAprovado();
  const supabase = await createClient();
  const { error } = await supabase
    .from("aula_progresso")
    .delete()
    .eq("membro_id", user.id)
    .eq("aula_id", aulaId);
  if (error) throw new Error(`Não foi possível desmarcar: ${error.message}`);
  revalidatePath("/membro/treinamentos", "layout");
}
