"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function salvarConfigCreditos(input: {
  modoCredito: string;
  creditosMensaisPadrao: number;
  custoPorGeracao: number;
  modeloIaConteudo: string;
}) {
  const user = await requireAdmin();
  const admin = createAdminClient();

  const { data: config } = await admin.from("configuracoes_gerais").select("id").limit(1).single();
  if (!config) {
    throw new Error("Configuração da plataforma não encontrada.");
  }

  const { error } = await admin
    .from("configuracoes_gerais")
    .update({
      modo_credito: input.modoCredito,
      creditos_mensais_padrao: input.creditosMensaisPadrao,
      custo_por_geracao: input.custoPorGeracao,
      modelo_ia_conteudo: input.modeloIaConteudo,
      updated_by: user.id,
    })
    .eq("id", config.id);

  if (error) {
    throw new Error(`Não foi possível salvar: ${error.message}`);
  }

  revalidatePath("/admin/conteudo/creditos");
}

// RPC conteudo_ajustar_credito (migration 0017) trava por usuário e grava um
// lançamento tipo 'ajuste_admin' — mesma lógica atômica usada pra débito na
// geração, só que aqui define o saldo alvo direto em vez de subtrair um custo.
export async function ajustarCreditoMembro(usuarioId: string, novoSaldo: number): Promise<number> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .rpc("conteudo_ajustar_credito", { p_usuario_id: usuarioId, p_novo_saldo: Math.max(0, novoSaldo) })
    .single();

  if (error) {
    throw new Error(`Não foi possível ajustar: ${error.message}`);
  }

  revalidatePath("/admin/conteudo/creditos");
  return data.saldo_apos;
}

export async function ajustarCreditoEmMassa(
  ajustes: { usuarioId: string; novoSaldo: number }[]
): Promise<Record<string, number>> {
  await requireAdmin();
  const admin = createAdminClient();

  const resultados: Record<string, number> = {};
  for (const { usuarioId, novoSaldo } of ajustes) {
    const { data, error } = await admin
      .rpc("conteudo_ajustar_credito", { p_usuario_id: usuarioId, p_novo_saldo: Math.max(0, novoSaldo) })
      .single();
    if (error) {
      throw new Error(`Falha ao ajustar um dos membros: ${error.message}`);
    }
    resultados[usuarioId] = data.saldo_apos;
  }

  revalidatePath("/admin/conteudo/creditos");
  return resultados;
}
