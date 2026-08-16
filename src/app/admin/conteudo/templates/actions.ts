"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ObjetivoConteudo, FormatoConteudo } from "@/lib/types/database.types";

// Editar cria uma VERSÃO NOVA (versao = max+1) em vez de sobrescrever a
// ativa — histórico de auditoria (seção 7 do prompt mestre) fica intacto.
export async function salvarTemplate(objetivo: ObjetivoConteudo, formato: FormatoConteudo, systemPrompt: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: atual } = await admin
    .from("conteudo_prompt_templates")
    .select("id, versao")
    .eq("objetivo", objetivo)
    .eq("formato", formato)
    .eq("ativo", true)
    .maybeSingle();

  if (atual) {
    const { error: errDesativar } = await admin
      .from("conteudo_prompt_templates")
      .update({ ativo: false })
      .eq("id", atual.id);
    if (errDesativar) {
      throw new Error(`Não foi possível salvar: ${errDesativar.message}`);
    }
  }

  const proximaVersao = (atual?.versao ?? 0) + 1;
  const { error } = await admin.from("conteudo_prompt_templates").insert({
    objetivo,
    formato,
    system_prompt: systemPrompt,
    ativo: true,
    versao: proximaVersao,
  });

  if (error) {
    // Reverte a desativação pra não deixar essa combinação sem template
    // ativo nenhum (a rota de geração depende de sempre haver um).
    if (atual) {
      await admin.from("conteudo_prompt_templates").update({ ativo: true }).eq("id", atual.id);
    }
    throw new Error(`Não foi possível salvar: ${error.message}`);
  }

  revalidatePath("/admin/conteudo/templates");
}

// Restaurar reativa a linha histórica exata (não cria versão nova) — "voltar
// pra v2" continua se chamando v2, em vez de virar "v5, cópia da v2".
export async function restaurarVersao(templateId: string, objetivo: ObjetivoConteudo, formato: FormatoConteudo) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: atual } = await admin
    .from("conteudo_prompt_templates")
    .select("id")
    .eq("objetivo", objetivo)
    .eq("formato", formato)
    .eq("ativo", true)
    .maybeSingle();

  if (atual && atual.id !== templateId) {
    const { error: errDesativar } = await admin
      .from("conteudo_prompt_templates")
      .update({ ativo: false })
      .eq("id", atual.id);
    if (errDesativar) {
      throw new Error(`Não foi possível restaurar: ${errDesativar.message}`);
    }
  }

  const { error } = await admin.from("conteudo_prompt_templates").update({ ativo: true }).eq("id", templateId);
  if (error) {
    throw new Error(`Não foi possível restaurar: ${error.message}`);
  }

  revalidatePath("/admin/conteudo/templates");
}
