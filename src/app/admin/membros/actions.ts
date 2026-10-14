"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarLog, type AcaoAcesso } from "@/lib/acesso/log";
import { desconectarInstanciaDoMembro } from "@/lib/acesso/robo";
import type { AgenteModo, MembroStatus } from "@/lib/types/database.types";

const MODOS_ROBO: AgenteModo[] = ["recrutamento", "energia"];

function revalidarMembro(usuarioId?: string) {
  revalidatePath("/admin", "layout"); // contador de pendências no menu
  revalidatePath("/admin/membros");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/logs");
  if (usuarioId) revalidatePath(`/admin/membros/${usuarioId}`);
}

function acaoDoStatus(anterior: MembroStatus | null, novo: MembroStatus): AcaoAcesso {
  if (novo === "ativo") return anterior === "pendente" ? "membro_aprovado" : "membro_reativado";
  if (novo === "recusado") return "membro_recusado";
  return "membro_suspenso";
}

export async function setMembroStatus(
  usuarioId: string,
  status: Exclude<MembroStatus, "inativo">,
  motivo?: string
) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: atual } = await supabase
    .from("membros")
    .select("status")
    .eq("usuario_id", usuarioId)
    .single();

  // Trigger 0027 revoga o robô no mesmo update quando vira suspenso/recusado.
  const { error } = await supabase
    .from("membros")
    .update({ status, motivo_status: motivo?.trim() || null })
    .eq("usuario_id", usuarioId);
  if (error) throw new Error(`Não foi possível atualizar o status: ${error.message}`);

  if (status === "suspenso" || status === "recusado") {
    await desconectarInstanciaDoMembro(usuarioId);
  }

  await registrarLog({
    atorId: admin.id,
    membroId: usuarioId,
    acao: acaoDoStatus(atual?.status ?? null, status),
    motivo,
    detalhes: { de: atual?.status ?? null, para: status },
  });

  revalidarMembro(usuarioId);
}

export async function aprovarMembrosEmLote(usuarioIds: string[]) {
  const admin = await requireAdmin();
  if (usuarioIds.length === 0) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membros")
    .update({ status: "ativo", motivo_status: null })
    .in("usuario_id", usuarioIds)
    .eq("status", "pendente")
    .select("usuario_id");
  if (error) throw new Error(`Não foi possível aprovar: ${error.message}`);

  for (const { usuario_id } of data ?? []) {
    await registrarLog({
      atorId: admin.id,
      membroId: usuario_id,
      acao: "membro_aprovado",
      detalhes: { lote: true },
    });
  }

  revalidarMembro();
}

export async function removerMembro(usuarioId: string) {
  const adminUser = await requireAdmin();

  // Desconecta antes: depois do delete a sessão (e o instance_name) somem.
  await desconectarInstanciaDoMembro(usuarioId);

  // Deleta via Auth Admin API: cascateia para usuarios, membros, kanban_boards/
  // columns/cards, whatsapp_sessions e robo_acesso (todos com ON DELETE CASCADE).
  const admin = createAdminClient();
  const { data: usuario } = await admin
    .from("usuarios")
    .select("nome_completo, email")
    .eq("id", usuarioId)
    .single();
  const { error } = await admin.auth.admin.deleteUser(usuarioId);

  if (error) {
    throw new Error(`Não foi possível remover o membro: ${error.message}`);
  }

  // membro_id vira null (FK on delete set null): guarda quem era em detalhes.
  await registrarLog({
    atorId: adminUser.id,
    membroId: null,
    acao: "membro_removido",
    detalhes: { nome: usuario?.nome_completo ?? null, email: usuario?.email ?? null },
  });

  revalidarMembro();
}

// ---------------------------------------------------------------------------
// Robô de WhatsApp
// ---------------------------------------------------------------------------

function validarConfigRobo(modos: AgenteModo[], limite: number) {
  const modosValidos = modos.filter((m) => MODOS_ROBO.includes(m));
  if (modosValidos.length === 0) throw new Error("Escolha pelo menos um modo.");
  if (!Number.isInteger(limite) || limite < 1 || limite > 1000) {
    throw new Error("O limite diário precisa ser um número entre 1 e 1000.");
  }
  return Array.from(new Set(modosValidos));
}

// Se o modo em uso pelo membro deixou de ser permitido, troca para o primeiro
// permitido (sem isso o robô ficaria mudo sem o membro entender por quê).
// 'sunne' não entra nessa regra: tem gate próprio.
async function ajustarModoAtivo(usuarioId: string, modos: AgenteModo[]) {
  const supabase = await createClient();
  const { data: membro } = await supabase
    .from("membros")
    .select("modo_agente_ativo")
    .eq("usuario_id", usuarioId)
    .single();
  const modoAtual = membro?.modo_agente_ativo;
  if (!modoAtual || modoAtual === "sunne" || modos.includes(modoAtual)) return;

  const { error } = await supabase
    .from("membros")
    .update({ modo_agente_ativo: modos[0] })
    .eq("usuario_id", usuarioId);
  if (error) throw new Error(error.message);
}

export async function liberarRobo(usuarioId: string, modos: AgenteModo[], limite: number) {
  const admin = await requireAdmin();
  const modosValidos = validarConfigRobo(modos, limite);

  const supabase = await createClient();
  const { error } = await supabase
    .from("robo_acesso")
    .update({ status: "liberado", modos_permitidos: modosValidos, limite_diario_mensagens: limite })
    .eq("membro_id", usuarioId);
  if (error) throw new Error(`Não foi possível liberar o robô: ${error.message}`);

  await ajustarModoAtivo(usuarioId, modosValidos);
  await registrarLog({
    atorId: admin.id,
    membroId: usuarioId,
    acao: "robo_liberado",
    detalhes: { modos: modosValidos, limite },
  });

  revalidarMembro(usuarioId);
}

export async function atualizarRobo(usuarioId: string, modos: AgenteModo[], limite: number) {
  const admin = await requireAdmin();
  const modosValidos = validarConfigRobo(modos, limite);

  const supabase = await createClient();
  const { error } = await supabase
    .from("robo_acesso")
    .update({ modos_permitidos: modosValidos, limite_diario_mensagens: limite })
    .eq("membro_id", usuarioId);
  if (error) throw new Error(`Não foi possível salvar: ${error.message}`);

  await ajustarModoAtivo(usuarioId, modosValidos);
  await registrarLog({
    atorId: admin.id,
    membroId: usuarioId,
    acao: "robo_atualizado",
    detalhes: { modos: modosValidos, limite },
  });

  revalidarMembro(usuarioId);
}

// Recusar o pedido devolve para 'sem_acesso' (o membro pode pedir de novo
// depois), guardando o motivo para ele ver na tela.
export async function recusarSolicitacaoRobo(usuarioId: string, motivo?: string) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("robo_acesso")
    .update({ status: "sem_acesso", motivo_revogacao: motivo?.trim() || null })
    .eq("membro_id", usuarioId)
    .eq("status", "solicitado");
  if (error) throw new Error(`Não foi possível recusar: ${error.message}`);

  await registrarLog({ atorId: admin.id, membroId: usuarioId, acao: "robo_solicitacao_recusada", motivo });
  revalidarMembro(usuarioId);
}

export async function revogarRobo(usuarioId: string, motivo?: string) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("robo_acesso")
    .update({ status: "revogado", motivo_revogacao: motivo?.trim() || null })
    .eq("membro_id", usuarioId);
  if (error) throw new Error(`Não foi possível revogar: ${error.message}`);

  await desconectarInstanciaDoMembro(usuarioId);
  await registrarLog({ atorId: admin.id, membroId: usuarioId, acao: "robo_revogado", motivo });
  revalidarMembro(usuarioId);
}

// Fase 3: quem convidou quem. O trigger do banco recusa ciclos (patrocinador
// que está na linha descendente do próprio membro).
export async function definirPatrocinador(usuarioId: string, patrocinadorId: string | null) {
  const admin = await requireAdmin();
  if (patrocinadorId === usuarioId) throw new Error("O membro não pode ser patrocinador de si mesmo.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("membros")
    .update({ patrocinador_id: patrocinadorId })
    .eq("usuario_id", usuarioId);
  if (error) {
    if (error.message.includes("linha descendente")) {
      throw new Error("Esse patrocinador está na equipe deste membro (criaria um ciclo).");
    }
    throw new Error(`Não foi possível salvar: ${error.message}`);
  }
  await registrarLog({
    atorId: admin.id,
    membroId: usuarioId,
    acao: "patrocinador_definido",
    detalhes: { patrocinador_id: patrocinadorId },
  });
  revalidarMembro(usuarioId);
  revalidatePath("/admin/radar");
}
