"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { TipoTarefa } from "@/lib/types/database.types";

const TIPOS: TipoTarefa[] = ["assistir", "executar", "responder"];

function revalidar() {
  revalidatePath("/admin/trilha");
  revalidatePath("/membro/trilha");
  revalidatePath("/membro/dashboard");
}

export type MissaoInput = {
  id?: string;
  dia: number;
  titulo: string;
  descricao: string;
  videoUrl: string;
  tipo: TipoTarefa;
  ativo: boolean;
};

function validar(input: MissaoInput) {
  if (!Number.isInteger(input.dia) || input.dia < 1 || input.dia > 7) throw new Error("Dia inválido.");
  if (!TIPOS.includes(input.tipo)) throw new Error("Tipo de tarefa inválido.");
  const titulo = input.titulo.trim();
  const descricao = input.descricao.trim();
  const videoUrl = input.videoUrl.trim() || null;
  if (!titulo || titulo.length > 100) throw new Error("O título precisa ter de 1 a 100 caracteres.");
  if (descricao.length > 2000) throw new Error("A descrição pode ter até 2000 caracteres.");
  if (videoUrl && !/^https:\/\/\S+$/i.test(videoUrl)) {
    throw new Error("O link do vídeo precisa começar com https://");
  }
  return { titulo, descricao, videoUrl };
}

export async function salvarMissao(input: MissaoInput) {
  await requireAdmin();
  const supabase = await createClient();
  const { titulo, descricao, videoUrl } = validar(input);

  if (input.id) {
    const { data: atual } = await supabase.from("missoes").select("dia").eq("id", input.id).single();
    // Mudou de dia: vai para o fim do novo dia.
    let ordem: number | undefined;
    if (atual && atual.dia !== input.dia) ordem = await proximaOrdem(input.dia);
    const { error } = await supabase
      .from("missoes")
      .update({
        dia: input.dia,
        titulo,
        descricao,
        video_url: videoUrl,
        tipo_tarefa: input.tipo,
        ativo: input.ativo,
        ...(ordem !== undefined ? { ordem } : {}),
      })
      .eq("id", input.id);
    if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  } else {
    const { error } = await supabase.from("missoes").insert({
      dia: input.dia,
      titulo,
      descricao,
      video_url: videoUrl,
      tipo_tarefa: input.tipo,
      ativo: input.ativo,
      ordem: await proximaOrdem(input.dia),
    });
    if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  }
  revalidar();
}

async function proximaOrdem(dia: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("missoes")
    .select("ordem")
    .eq("dia", dia)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.ordem ?? -1) + 1;
}

export async function alternarMissaoAtiva(id: string, ativo: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("missoes").update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

export async function ativarTodasMissoes() {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("missoes").update({ ativo: true }).eq("ativo", false);
  if (error) throw new Error(error.message);
  revalidar();
}

export async function moverMissao(id: string, direcao: "cima" | "baixo") {
  await requireAdmin();
  const supabase = await createClient();
  const { data: atual } = await supabase.from("missoes").select("dia").eq("id", id).single();
  if (!atual) throw new Error("Missão não encontrada.");
  const { data } = await supabase
    .from("missoes")
    .select("id, ordem")
    .eq("dia", atual.dia)
    .order("ordem")
    .order("created_at");
  const itens = data ?? [];
  const i = itens.findIndex((m) => m.id === id);
  const j = direcao === "cima" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= itens.length) return;
  const nova = [...itens];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  for (const [ordem, m] of nova.entries()) {
    if (m.ordem === ordem) continue;
    const { error } = await supabase.from("missoes").update({ ordem }).eq("id", m.id);
    if (error) throw new Error(`Não foi possível reordenar: ${error.message}`);
  }
  revalidar();
}

export async function removerMissao(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("missoes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}
