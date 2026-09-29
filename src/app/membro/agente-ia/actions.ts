"use server";

import { revalidatePath } from "next/cache";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  connectEvolutionInstanceWithPhone,
  createEvolutionInstance,
  logoutEvolutionInstance,
} from "@/lib/evolution/client";
import type { AgenteModo, GeneroAgente } from "@/lib/types/database.types";

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

// Alternativa ao QR: gera o código de 8 caracteres do fluxo "Conectar com
// número de telefone" do WhatsApp, que dispara com menos frequência o aviso
// de "tentativa de golpe". Recria a instância do zero (ver client.ts).
export async function conectarWhatsappPorNumero(
  numeroBruto: string
): Promise<{ pairingCode: string | null }> {
  const user = await requireMembro();
  const digits = numeroBruto.replace(/\D/g, "");

  // BR com código do país: 55 + DDD (2) + número (8 ou 9). 12 a 13 dígitos.
  if (digits.length < 12 || digits.length > 13) {
    throw new Error(
      "Número inválido. Informe com o código do país e DDD, ex: 55 84 99999-9999."
    );
  }

  const instanceName = `membro-${user.id}`;
  const { pairingCode } = await connectEvolutionInstanceWithPhone(instanceName, digits);

  const supabase = await createClient();
  const { error } = await supabase
    .from("whatsapp_sessions")
    .update({ instance_name: instanceName, qr_code: null, status: "aguardando_qr" })
    .eq("membro_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/membro/agente-ia");
  return { pairingCode };
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

export async function atualizarNomeAgente(nome: string, genero: GeneroAgente | null) {
  const user = await requireMembro();
  const supabase = await createClient();

  const nomeAgente = nome.trim() || null;

  const { error } = await supabase
    .from("membros")
    .update({ nome_agente: nomeAgente, genero_agente: genero })
    .eq("usuario_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/membro/agente-ia");
}
