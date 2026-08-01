"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembro } from "@/lib/auth/guards";

export async function atualizarLinksPessoais(input: {
  linkRecrutamento: string;
  linkEnergia: string;
}) {
  const user = await requireMembro();
  const supabase = await createClient();

  const { error } = await supabase
    .from("membros")
    .update({
      link_recrutamento: input.linkRecrutamento.trim() || null,
      link_energia: input.linkEnergia.trim() || null,
    })
    .eq("usuario_id", user.id);

  if (error) {
    throw new Error(`Não foi possível salvar: ${error.message}`);
  }

  revalidatePath("/membro/perfil");
}
