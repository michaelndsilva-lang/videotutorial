"use server";

import { revalidatePath } from "next/cache";
import { requireMembroAprovado } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

function revalidar() {
  revalidatePath("/membro/mural");
  revalidatePath("/membro/dashboard");
}

export async function alternarLembrete(eventoId: string, querLembrete: boolean) {
  const user = await requireMembroAprovado();
  const supabase = await createClient();
  const { error } = querLembrete
    ? await supabase.from("evento_lembretes").insert({ evento_id: eventoId, membro_id: user.id })
    : await supabase.from("evento_lembretes").delete().eq("evento_id", eventoId).eq("membro_id", user.id);
  if (error && error.code !== "23505") {
    throw new Error(error.message.includes("row-level") ? "Esse evento já começou." : error.message);
  }
  revalidar();
}

export async function publicarConquista(texto: string) {
  const user = await requireMembroAprovado();
  const limpo = texto.trim();
  if (!limpo || limpo.length > 280) throw new Error("Escreva sua conquista em até 280 caracteres.");
  const supabase = await createClient();
  const { error } = await supabase.from("conquistas").insert({ membro_id: user.id, texto: limpo });
  if (error) throw new Error(`Não foi possível publicar: ${error.message}`);
  revalidar();
}

export async function removerMinhaConquista(id: string) {
  const user = await requireMembroAprovado();
  const supabase = await createClient();
  const { error } = await supabase.from("conquistas").delete().eq("id", id).eq("membro_id", user.id);
  if (error) throw new Error(error.message);
  revalidar();
}

export async function alternarCurtida(conquistaId: string, curtir: boolean) {
  const user = await requireMembroAprovado();
  const supabase = await createClient();
  const { error } = curtir
    ? await supabase.from("conquista_curtidas").insert({ conquista_id: conquistaId, membro_id: user.id })
    : await supabase.from("conquista_curtidas").delete().eq("conquista_id", conquistaId).eq("membro_id", user.id);
  if (error && error.code !== "23505") throw new Error(error.message);
  revalidar();
}
