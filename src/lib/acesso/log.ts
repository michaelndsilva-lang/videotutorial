import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/types/database.types";

export type AcaoAcesso =
  | "cadastro"
  | "membro_aprovado"
  | "membro_recusado"
  | "membro_suspenso"
  | "membro_reativado"
  | "membro_removido"
  | "robo_solicitado"
  | "robo_liberado"
  | "robo_solicitacao_recusada"
  | "robo_revogado"
  | "robo_atualizado"
  | "material_criado"
  | "material_editado"
  | "material_removido"
  | "patrocinador_definido";

export const ACAO_LABEL: Record<AcaoAcesso, string> = {
  cadastro: "Novo cadastro",
  membro_aprovado: "Membro aprovado",
  membro_recusado: "Membro recusado",
  membro_suspenso: "Membro suspenso",
  membro_reativado: "Membro reativado",
  membro_removido: "Membro removido",
  robo_solicitado: "Robô solicitado",
  robo_liberado: "Robô liberado",
  robo_solicitacao_recusada: "Solicitação de robô recusada",
  robo_revogado: "Robô revogado",
  robo_atualizado: "Limite/modos do robô alterados",
  material_criado: "Material adicionado",
  material_editado: "Material editado",
  material_removido: "Material removido",
  patrocinador_definido: "Patrocinador definido",
};

// access_logs não tem policy de insert: só o servidor (service-role) grava.
// Falha no log não pode desfazer a ação principal, então só registra o erro.
export async function registrarLog(entrada: {
  atorId: string | null;
  membroId: string | null;
  acao: AcaoAcesso;
  motivo?: string | null;
  detalhes?: Json;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("access_logs").insert({
    ator_id: entrada.atorId,
    membro_id: entrada.membroId,
    acao: entrada.acao,
    motivo: entrada.motivo?.trim() || null,
    detalhes: entrada.detalhes ?? null,
  });
  if (error) console.error("Falha ao registrar access_log:", error);
}
