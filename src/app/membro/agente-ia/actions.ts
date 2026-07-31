"use server";

import { revalidatePath } from "next/cache";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createEvolutionInstance, logoutEvolutionInstance } from "@/lib/evolution/client";
import type { AgenteModo } from "@/lib/types/database.types";

export async function conectarWhatsapp() {
  const user = await requireMembro();
  const instanceName = `membro-${user.id}`;

  const { qrCodeBase64 } = await createEvolutionInstance(instanceName);

  const supabase = await createClient();
  const { error } = await supabase
    .from("whatsapp_sessions")
    .update({ instance_name: instanceName, qr_code: qrCodeBase64, status: "aguardando_qr" })
    .eq("membro_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/membro/agente-ia");
}

export async function desconectarWhatsapp() {
  const user = await requireMembro();
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("whatsapp_sessions")
    .select("instance_name")
    .eq("membro_id", user.id)
    .single();

  if (session?.instance_name) {
    // Best-effort: a Evolution API pode recusar o logout se a sessão já não
    // estiver conectada; isso não deve impedir de marcar como desconectado localmente.
    try {
      await logoutEvolutionInstance(session.instance_name);
    } catch {
      // ignorado de propósito
    }
  }

  const { error } = await supabase
    .from("whatsapp_sessions")
    .update({ status: "desconectado", qr_code: null, phone_number: null, connected_at: null })
    .eq("membro_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/membro/agente-ia");
}

export async function atualizarModoAgente(modo: AgenteModo) {
  const user = await requireMembro();
  const supabase = await createClient();

  const { error } = await supabase
    .from("membros")
    .update({ modo_agente_ativo: modo })
    .eq("usuario_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/membro/agente-ia");
}

export async function atualizarNomeAgente(nome: string) {
  const user = await requireMembro();
  const supabase = await createClient();

  const nomeAgente = nome.trim() || null;

  const { error } = await supabase
    .from("membros")
    .update({ nome_agente: nomeAgente })
    .eq("usuario_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/membro/agente-ia");
}
