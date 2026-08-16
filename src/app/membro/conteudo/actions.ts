"use server";

import { requireMembro } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

// Compartilhado entre a tela de geração e a biblioteca — favoritar é a única
// escrita que o membro faz direto numa linha de conteudo_geracoes (o resto é
// bloqueado pela trigger prevent_conteudo_geracao_campo_protegido, migration 0015).
export async function alternarFavorito(geracaoId: string, favorito: boolean) {
  const user = await requireMembro();
  const admin = createAdminClient();

  const { error } = await admin
    .from("conteudo_geracoes")
    .update({ favorito })
    .eq("id", geracaoId)
    .eq("usuario_id", user.id);

  if (error) {
    throw new Error(`Não foi possível favoritar: ${error.message}`);
  }
}
