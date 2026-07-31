"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembro } from "@/lib/auth/guards";

export async function atualizarConfiguracoesGerais(input: {
  linkRecrutamentoPadrao: string;
  linkEnergiaPadrao: string;
}) {
  const user = await requireMembro();
  const supabase = await createClient();

  const { data: config } = await supabase
    .from("configuracoes_gerais")
    .select("id")
    .limit(1)
    .single();

  if (!config) {
    throw new Error("Configuração geral não encontrada.");
  }

  const { error } = await supabase
    .from("configuracoes_gerais")
    .update({
      link_recrutamento_padrao: input.linkRecrutamentoPadrao.trim() || null,
      link_energia_padrao: input.linkEnergiaPadrao.trim() || null,
      updated_by: user.id,
    })
    .eq("id", config.id);

  if (error) {
    throw new Error(`Não foi possível salvar: ${error.message}`);
  }

  revalidatePath("/membro/perfil");
}
