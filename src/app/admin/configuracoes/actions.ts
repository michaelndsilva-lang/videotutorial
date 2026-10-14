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

// Parâmetros do simulador de energia (Fase 2).
export async function salvarEnergiaConfig(input: {
  descontoPercentual: number;
  fatiaConsumoPercentual: number;
  contaMinima: number;
  ufsAtendidas: string[];
  aviso: string;
}) {
  const user = await requireAdmin();
  const { descontoPercentual: d, fatiaConsumoPercentual: f, contaMinima: m } = input;
  if (!(d > 0 && d <= 50)) throw new Error("O desconto precisa estar entre 0 e 50%.");
  if (!(f > 0 && f <= 100)) throw new Error("A fatia do consumo precisa estar entre 0 e 100%.");
  if (!(m >= 0)) throw new Error("Conta mínima inválida.");
  const aviso = input.aviso.trim();
  if (!aviso || aviso.length > 1000) throw new Error("O aviso precisa ter de 1 a 1000 caracteres.");
  const ufs = Array.from(
    new Set(input.ufsAtendidas.map((u) => u.toUpperCase()).filter((u) => /^[A-Z]{2}$/.test(u)))
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("energia_config")
    .update({
      desconto_percentual: d,
      fatia_consumo_percentual: f,
      conta_minima: m,
      ufs_atendidas: ufs,
      aviso,
      updated_by: user.id,
    })
    .eq("id", 1);
  if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  revalidatePath("/admin/configuracoes");
  revalidatePath("/membro/simulador");
}
