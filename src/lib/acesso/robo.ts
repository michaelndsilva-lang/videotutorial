import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { logoutEvolutionInstance } from "@/lib/evolution/client";
import type { AgenteModo, Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;

// Brasil não tem horário de verão desde 2019: o "dia" do limite diário começa
// à meia-noite de Brasília (UTC-3).
export function inicioDoDiaBrasilia(agora = new Date()): string {
  const data = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
  return new Date(`${data}T00:00:00-03:00`).toISOString();
}

export type RoboPodeResponder =
  | { ok: true }
  | { ok: false; motivo: "nao_liberado" | "modo_nao_permitido" | "limite_diario" };

// Usado pelo webhook e pelo cron de follow-up (service-role) antes de qualquer
// envio do robô. `modo` é o modo efetivo da conversa; 'sunne' tem gate próprio
// (membros.sunne_habilitado) e não passa por modos_permitidos.
export async function roboPodeResponder(
  supabase: Client,
  membroId: string,
  modo: AgenteModo
): Promise<RoboPodeResponder> {
  const { data: acesso, error } = await supabase
    .from("robo_acesso")
    .select("status, modos_permitidos, limite_diario_mensagens")
    .eq("membro_id", membroId)
    .maybeSingle();
  if (error) throw error;

  if (!acesso || acesso.status !== "liberado") return { ok: false, motivo: "nao_liberado" };
  if (modo !== "sunne" && !acesso.modos_permitidos.includes(modo)) {
    return { ok: false, motivo: "modo_nao_permitido" };
  }

  const { count, error: countError } = await supabase
    .from("agente_mensagens")
    .select("id", { count: "exact", head: true })
    .eq("membro_id", membroId)
    .eq("remetente", "agente")
    .gte("created_at", inicioDoDiaBrasilia());
  if (countError) throw countError;

  if ((count ?? 0) >= acesso.limite_diario_mensagens) return { ok: false, motivo: "limite_diario" };
  return { ok: true };
}

// Para server actions do membro (conectar WhatsApp etc.): nunca confiar só na UI.
export async function exigirRoboLiberado(supabase: Client, membroId: string) {
  const { data, error } = await supabase
    .from("robo_acesso")
    .select("status, modos_permitidos")
    .eq("membro_id", membroId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.status !== "liberado") {
    throw new Error("O robô de WhatsApp ainda não foi liberado para você.");
  }
  return data;
}

// Desconecta a instância do membro na Evolution e marca a sessão como
// desconectada. Best-effort na Evolution (a instância pode já estar fora).
export async function desconectarInstanciaDoMembro(membroId: string) {
  const admin = createAdminClient();
  const { data: sessao } = await admin
    .from("whatsapp_sessions")
    .select("instance_name, status")
    .eq("membro_id", membroId)
    .maybeSingle();

  if (sessao?.instance_name) {
    try {
      await logoutEvolutionInstance(sessao.instance_name);
    } catch {
      // ignorado de propósito: o importante é o robô parar de responder,
      // e o webhook já barra quem não está liberado.
    }
  }

  const { error } = await admin
    .from("whatsapp_sessions")
    .update({ status: "desconectado", qr_code: null, phone_number: null, connected_at: null })
    .eq("membro_id", membroId);
  if (error) throw new Error(error.message);
}
