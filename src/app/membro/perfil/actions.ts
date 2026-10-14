"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembroAprovado } from "@/lib/auth/guards";

export async function atualizarLinksPessoais(input: {
  linkRecrutamento: string;
  linkEnergia: string;
  linkLoja: string;
}) {
  const linkLoja = input.linkLoja.trim() || null;
  if (linkLoja && !/^https:\/\/\S+$/i.test(linkLoja)) {
    throw new Error("O link da loja precisa começar com https://");
  }

  const user = await requireMembroAprovado();
  const supabase = await createClient();

  const { error } = await supabase
    .from("membros")
    .update({
      link_recrutamento: input.linkRecrutamento.trim() || null,
      link_energia: input.linkEnergia.trim() || null,
      link_loja: linkLoja,
    })
    .eq("usuario_id", user.id);

  if (error) {
    throw new Error(`Não foi possível salvar: ${error.message}`);
  }

  revalidatePath("/membro/perfil");
  revalidatePath("/membro/catalogo", "layout");
}
