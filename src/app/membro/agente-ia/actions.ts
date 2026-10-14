"use server";

import { revalidatePath } from "next/cache";
import { requireMembroAprovado } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  connectEvolutionInstanceWithPhone,
  createEvolutionInstance,
  logoutEvolutionInstance,
} from "@/lib/evolution/client";
import { exigirRoboLiberado } from "@/lib/acesso/robo";
import { registrarLog } from "@/lib/acesso/log";
import { notificarAdmin } from "@/lib/acesso/notificar-admin";
import type { AgenteModo, GeneroAgente } from "@/lib/types/database.types";

export async function conectarWhatsapp() {
  const user = await requireMembroAprovado();
  const supabase = await createClient();
  await exigirRoboLiberado(supabase, user.id);

  const instanceName = `membro-${user.id}`;
  const { qrCodeBase64 } = await createEvolutionInstance(instanceName);

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
  const user = await requireMembroAprovado();
  const digits = numeroBruto.replace(/\D/g, "");

  // BR com código do país: 55 + DDD (2) + número (8 ou 9). 12 a 13 dígitos.
  if (digits.length < 12 || digits.length > 13) {
    throw new Error(
      "Número inválido. Informe com o código do país e DDD, ex: 55 84 99999-9999."
    );
  }

  const supabase = await createClient();
  await exigirRoboLiberado(supabase, user.id);

  const instanceName = `membro-${user.id}`;
  const { pairingCode } = await connectEvolutionInstanceWithPhone(instanceName, digits);

  const { error } = await supabase
    .from("whatsapp_sessions")
    .update({ instance_name: instanceName, qr_code: null, status: "aguardando_qr" })
    .eq("membro_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/membro/agente-ia");
  return { pairingCode };
}

export async function desconectarWhatsapp() {
  const user = await requireMembroAprovado();
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
  const user = await requireMembroAprovado();
  const supabase = await createClient();

  // 'sunne' tem gate próprio no banco (trigger da 0023); os demais modos
  // precisam estar entre os liberados pelo admin.
  const acesso = await exigirRoboLiberado(supabase, user.id);
  if (modo !== "sunne" && !acesso.modos_permitidos.includes(modo)) {
    throw new Error("Este modo não foi liberado para você.");
  }

  const { error } = await supabase
    .from("membros")
    .update({ modo_agente_ativo: modo })
    .eq("usuario_id", user.id);
  if (error) {
    // Trigger do banco (0023) barra 'sunne' para quem não foi liberado.
    throw new Error(modo === "sunne" ? "Modo não disponível." : error.message);
  }

  revalidatePath("/membro/agente-ia");
}

export async function atualizarNomeAgente(nome: string, genero: GeneroAgente | null) {
  const user = await requireMembroAprovado();
  const supabase = await createClient();

  const nomeAgente = nome.trim() || null;

  const { error } = await supabase
    .from("membros")
    .update({ nome_agente: nomeAgente, genero_agente: genero })
    .eq("usuario_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/membro/agente-ia");
}

// Membro aprovado pede acesso ao robô aceitando o termo de ciência. O trigger
// do banco (0027) só permite 'sem_acesso' -> 'solicitado' e grava as datas.
export async function solicitarAcessoRobo(aceitouTermo: boolean) {
  const user = await requireMembroAprovado();
  if (!aceitouTermo) {
    throw new Error("É preciso aceitar o termo de ciência para solicitar.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("robo_acesso")
    .update({ status: "solicitado", termo_aceito_em: new Date().toISOString() })
    .eq("membro_id", user.id)
    .eq("status", "sem_acesso")
    .select("membro_id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Não há solicitação pendente para enviar.");

  await registrarLog({ atorId: user.id, membroId: user.id, acao: "robo_solicitado" });

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome_completo, email")
    .eq("id", user.id)
    .single();
  await notificarAdmin(
    `🤖 ATL Prospect: ${usuario?.nome_completo || usuario?.email || "Um membro"} solicitou acesso ao robô de WhatsApp.`,
    "/admin/membros?aba=robo"
  );

  revalidatePath("/membro/agente-ia");
}
