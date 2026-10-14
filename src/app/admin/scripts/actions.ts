"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

function revalidar() {
  revalidatePath("/admin/scripts");
  revalidatePath("/membro/scripts");
}

function validarNomeCategoria(nome: string) {
  const limpo = nome.trim();
  if (!limpo || limpo.length > 40) throw new Error("O nome da categoria precisa ter de 1 a 40 caracteres.");
  return limpo;
}

function validarScript(titulo: string, texto: string) {
  const t = titulo.trim();
  const x = texto.trim();
  if (!t || t.length > 80) throw new Error("O título precisa ter de 1 a 80 caracteres.");
  if (!x || x.length > 2000) throw new Error("O texto precisa ter de 1 a 2000 caracteres.");
  return { titulo: t, texto: x };
}

function erroAmigavel(mensagem: string) {
  return mensagem.includes("duplicate key") ? "Já existe uma categoria com esse nome." : mensagem;
}

// Troca de posição com o vizinho e renumera a lista (corrige ordens repetidas).
async function reordenar(
  tabela: "script_categorias" | "scripts",
  itens: { id: string; ordem: number }[],
  id: string,
  direcao: "cima" | "baixo"
) {
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
// Categorias
// ---------------------------------------------------------------------------

export async function criarCategoria(nome: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: ultima } = await supabase
    .from("script_categorias")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("script_categorias")
    .insert({ nome: validarNomeCategoria(nome), ordem: (ultima?.ordem ?? -1) + 1 });
  if (error) throw new Error(erroAmigavel(error.message));
  revalidar();
}

export async function renomearCategoria(id: string, nome: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("script_categorias")
    .update({ nome: validarNomeCategoria(nome) })
    .eq("id", id);
  if (error) throw new Error(erroAmigavel(error.message));
  revalidar();
}

export async function alternarCategoriaAtiva(id: string, ativo: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("script_categorias").update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

export async function moverCategoria(id: string, direcao: "cima" | "baixo") {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("script_categorias").select("id, ordem").order("ordem").order("nome");
  await reordenar("script_categorias", data ?? [], id, direcao);
  revalidar();
}

export async function removerCategoria(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  // on delete cascade: leva junto os scripts e o histórico de uso deles.
  const { error } = await supabase.from("script_categorias").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

// ---------------------------------------------------------------------------
// Scripts
// ---------------------------------------------------------------------------

export async function salvarScript(input: {
  id?: string;
  categoriaId: string;
  titulo: string;
  texto: string;
  ativo: boolean;
}) {
  await requireAdmin();
  const supabase = await createClient();
  const { titulo, texto } = validarScript(input.titulo, input.texto);

  if (input.id) {
    const { error } = await supabase
      .from("scripts")
      .update({ categoria_id: input.categoriaId, titulo, texto, ativo: input.ativo })
      .eq("id", input.id);
    if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  } else {
    const { data: ultimo } = await supabase
      .from("scripts")
      .select("ordem")
      .eq("categoria_id", input.categoriaId)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from("scripts").insert({
      categoria_id: input.categoriaId,
      titulo,
      texto,
      ativo: input.ativo,
      ordem: (ultimo?.ordem ?? -1) + 1,
    });
    if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  }
  revalidar();
}

export async function alternarScriptAtivo(id: string, ativo: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("scripts").update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

export async function ativarScriptsDaCategoria(categoriaId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("scripts")
    .update({ ativo: true })
    .eq("categoria_id", categoriaId)
    .eq("ativo", false);
  if (error) throw new Error(error.message);
  revalidar();
}

export async function moverScript(id: string, direcao: "cima" | "baixo") {
  await requireAdmin();
  const supabase = await createClient();
  const { data: atual } = await supabase.from("scripts").select("categoria_id").eq("id", id).single();
  if (!atual) throw new Error("Script não encontrado.");
  const { data } = await supabase
    .from("scripts")
    .select("id, ordem")
    .eq("categoria_id", atual.categoria_id)
    .order("ordem")
    .order("titulo");
  await reordenar("scripts", data ?? [], id, direcao);
  revalidar();
}

export async function removerScript(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("scripts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}
