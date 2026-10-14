"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { extrairYoutubeId } from "@/lib/youtube";

function revalidar() {
  revalidatePath("/admin/treinamentos");
  revalidatePath("/membro/treinamentos", "layout");
}

async function reordenar(tabela: "cursos" | "aulas", itens: { id: string; ordem: number }[], id: string, direcao: "cima" | "baixo") {
  const i = itens.findIndex((x) => x.id === id);
  const j = direcao === "cima" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= itens.length) return;
  const nova = [...itens];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  const supabase = await createClient();
  for (const [ordem, item] of nova.entries()) {
    if (item.ordem === ordem) continue;
    const { error } = await supabase.from(tabela).update({ ordem }).eq("id", item.id);
    if (error) throw new Error(`Não foi possível reordenar: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Cursos
// ---------------------------------------------------------------------------

export async function salvarCurso(input: {
  id?: string;
  categoria: string;
  titulo: string;
  descricao: string;
  ativo: boolean;
}) {
  await requireAdmin();
  const categoria = input.categoria.trim();
  const titulo = input.titulo.trim();
  const descricao = input.descricao.trim();
  if (!categoria || categoria.length > 60) throw new Error("Informe uma categoria (até 60 caracteres).");
  if (!titulo || titulo.length > 120) throw new Error("Informe um título (até 120 caracteres).");
  if (descricao.length > 2000) throw new Error("A descrição pode ter até 2000 caracteres.");

  const supabase = await createClient();
  if (input.id) {
    const { error } = await supabase
      .from("cursos")
      .update({ categoria, titulo, descricao, ativo: input.ativo })
      .eq("id", input.id);
    if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  } else {
    const { data: ultimo } = await supabase
      .from("cursos")
      .select("ordem")
      .eq("categoria", categoria)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase
      .from("cursos")
      .insert({ categoria, titulo, descricao, ativo: input.ativo, ordem: (ultimo?.ordem ?? -1) + 1 });
    if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  }
  revalidar();
}

export async function alternarCursoAtivo(id: string, ativo: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("cursos").update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

export async function moverCurso(id: string, direcao: "cima" | "baixo") {
  await requireAdmin();
  const supabase = await createClient();
  const { data: atual } = await supabase.from("cursos").select("categoria").eq("id", id).single();
  if (!atual) throw new Error("Curso não encontrado.");
  const { data } = await supabase
    .from("cursos")
    .select("id, ordem")
    .eq("categoria", atual.categoria)
    .order("ordem")
    .order("created_at");
  await reordenar("cursos", data ?? [], id, direcao);
  revalidar();
}

export async function removerCurso(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("cursos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

// ---------------------------------------------------------------------------
// Aulas
// ---------------------------------------------------------------------------

export async function salvarAula(input: {
  id?: string;
  cursoId: string;
  titulo: string;
  descricao: string;
  videoUrl: string;
  ativo: boolean;
}) {
  await requireAdmin();
  const titulo = input.titulo.trim();
  const descricao = input.descricao.trim();
  const videoUrl = input.videoUrl.trim();
  if (!titulo || titulo.length > 120) throw new Error("Informe um título (até 120 caracteres).");
  if (descricao.length > 2000) throw new Error("A descrição pode ter até 2000 caracteres.");
  if (!extrairYoutubeId(videoUrl)) {
    throw new Error("Use um link do YouTube (ex.: https://youtu.be/...). Vídeo não listado funciona.");
  }

  const supabase = await createClient();
  if (input.id) {
    const { error } = await supabase
      .from("aulas")
      .update({ titulo, descricao, video_url: videoUrl, ativo: input.ativo })
      .eq("id", input.id);
    if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  } else {
    const { data: ultima } = await supabase
      .from("aulas")
      .select("ordem")
      .eq("curso_id", input.cursoId)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from("aulas").insert({
      curso_id: input.cursoId,
      titulo,
      descricao,
      video_url: videoUrl,
      ativo: input.ativo,
      ordem: (ultima?.ordem ?? -1) + 1,
    });
    if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  }
  revalidar();
}

export async function alternarAulaAtiva(id: string, ativo: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("aulas").update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

export async function moverAula(id: string, direcao: "cima" | "baixo") {
  await requireAdmin();
  const supabase = await createClient();
  const { data: atual } = await supabase.from("aulas").select("curso_id").eq("id", id).single();
  if (!atual) throw new Error("Aula não encontrada.");
  const { data } = await supabase
    .from("aulas")
    .select("id, ordem")
    .eq("curso_id", atual.curso_id)
    .order("ordem")
    .order("created_at");
  await reordenar("aulas", data ?? [], id, direcao);
  revalidar();
}

export async function removerAula(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("aulas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}
