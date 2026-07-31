"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export async function atualizarContaAdmin(nomeCompleto: string) {
  const user = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("usuarios")
    .update({ nome_completo: nomeCompleto.trim() || null })
    .eq("id", user.id);

  if (error) {
    throw new Error(`Não foi possível salvar: ${error.message}`);
  }

  revalidatePath("/admin/configuracoes");
}

export async function alterarSenhaAdmin(novaSenha: string) {
  await requireAdmin();

  if (novaSenha.length < 8) {
    throw new Error("A senha deve ter pelo menos 8 caracteres.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: novaSenha });

  if (error) {
    throw new Error(`Não foi possível alterar a senha: ${error.message}`);
  }
}
