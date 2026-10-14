"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { MAX_IMAGENS, PRODUTOS_BUCKET } from "@/lib/catalogo/produtos";

function revalidar() {
  revalidatePath("/admin/produtos");
  revalidatePath("/membro/catalogo", "layout");
  revalidatePath("/c/[slug]", "layout");
}

async function reordenar(
  tabela: "produto_categorias" | "produtos",
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

function nomeCategoria(nome: string) {
  const n = nome.trim();
  if (!n || n.length > 40) throw new Error("O nome da categoria precisa ter de 1 a 40 caracteres.");
  return n;
}

export async function criarCategoriaProduto(nome: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: ultima } = await supabase
    .from("produto_categorias")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("produto_categorias")
    .insert({ nome: nomeCategoria(nome), ordem: (ultima?.ordem ?? -1) + 1 });
  if (error) throw new Error(error.code === "23505" ? "Já existe uma categoria com esse nome." : error.message);
  revalidar();
}

export async function renomearCategoriaProduto(id: string, nome: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("produto_categorias").update({ nome: nomeCategoria(nome) }).eq("id", id);
  if (error) throw new Error(error.code === "23505" ? "Já existe uma categoria com esse nome." : error.message);
  revalidar();
}

export async function alternarCategoriaProduto(id: string, ativo: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("produto_categorias").update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

export async function moverCategoriaProduto(id: string, direcao: "cima" | "baixo") {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("produto_categorias").select("id, ordem").order("ordem").order("nome");
  await reordenar("produto_categorias", data ?? [], id, direcao);
  revalidar();
}

export async function removerCategoriaProduto(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { count } = await supabase
    .from("produtos")
    .select("id", { count: "exact", head: true })
    .eq("categoria_id", id);
  if (count) throw new Error("Mova ou remova os produtos desta categoria antes.");
  const { error } = await supabase.from("produto_categorias").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

export type ProdutoInput = {
  id?: string;
  categoriaId: string;
  nome: string;
  descricaoCurta: string;
  descricaoCompleta: string;
  beneficios: string[];
  modoDeUso: string;
  imagens: string[];
  precoReferencia: number | null;
  destaque: boolean;
  ativo: boolean;
  scriptIds: string[];
};

export async function salvarProduto(input: ProdutoInput) {
  await requireAdmin();
  const nome = input.nome.trim();
  if (!nome || nome.length > 100) throw new Error("O nome precisa ter de 1 a 100 caracteres.");
  if (input.descricaoCurta.trim().length > 200) throw new Error("A descrição curta pode ter até 200 caracteres.");
  if (input.descricaoCompleta.trim().length > 4000) throw new Error("A descrição completa pode ter até 4000 caracteres.");
  if (input.modoDeUso.trim().length > 2000) throw new Error("O modo de uso pode ter até 2000 caracteres.");
  if (input.imagens.length > MAX_IMAGENS) throw new Error(`No máximo ${MAX_IMAGENS} imagens.`);
  if (input.imagens.some((i) => !/^[\w-]+\.(jpg|png|webp)$/.test(i))) throw new Error("Imagem inválida.");
  if (input.precoReferencia != null && !(input.precoReferencia >= 0)) throw new Error("Preço inválido.");
  const beneficios = input.beneficios.map((b) => b.trim()).filter(Boolean).slice(0, 12);

  const supabase = await createClient();
  const dados = {
    categoria_id: input.categoriaId,
    nome,
    descricao_curta: input.descricaoCurta.trim(),
    descricao_completa: input.descricaoCompleta.trim(),
    beneficios,
    modo_de_uso: input.modoDeUso.trim(),
    imagens: input.imagens,
    preco_referencia: input.precoReferencia,
    destaque: input.destaque,
    ativo: input.ativo,
  };

  let produtoId = input.id;
  let removidas: string[] = [];
  if (produtoId) {
    const { data: atual } = await supabase.from("produtos").select("imagens").eq("id", produtoId).single();
    removidas = (atual?.imagens ?? []).filter((i) => !input.imagens.includes(i));
    const { error } = await supabase.from("produtos").update(dados).eq("id", produtoId);
    if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  } else {
    const { data: ultimo } = await supabase
      .from("produtos")
      .select("ordem")
      .eq("categoria_id", input.categoriaId)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from("produtos")
      .insert({ ...dados, ordem: (ultimo?.ordem ?? -1) + 1 })
      .select("id")
      .single();
    if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
    produtoId = data.id;
  }

  // Scripts vinculados: substitui o conjunto inteiro.
  const { error: delError } = await supabase.from("produto_scripts").delete().eq("produto_id", produtoId);
  if (delError) throw new Error(delError.message);
  const scriptIds = Array.from(new Set(input.scriptIds));
  if (scriptIds.length) {
    const { error } = await supabase
      .from("produto_scripts")
      .insert(scriptIds.map((script_id) => ({ produto_id: produtoId as string, script_id })));
    if (error) throw new Error(`Produto salvo, mas falhou ao vincular scripts: ${error.message}`);
  }

  if (removidas.length) await supabase.storage.from(PRODUTOS_BUCKET).remove(removidas);
  revalidar();
}

export async function alternarProduto(id: string, campo: "ativo" | "destaque", valor: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("produtos")
    .update(campo === "ativo" ? { ativo: valor } : { destaque: valor })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

export async function moverProduto(id: string, direcao: "cima" | "baixo") {
  await requireAdmin();
  const supabase = await createClient();
  const { data: atual } = await supabase.from("produtos").select("categoria_id").eq("id", id).single();
  if (!atual) throw new Error("Produto não encontrado.");
  const { data } = await supabase
    .from("produtos")
    .select("id, ordem")
    .eq("categoria_id", atual.categoria_id)
    .order("ordem")
    .order("nome");
  await reordenar("produtos", data ?? [], id, direcao);
  revalidar();
}

export async function removerProduto(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: produto } = await supabase.from("produtos").select("imagens").eq("id", id).single();
  const { error } = await supabase.from("produtos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (produto?.imagens.length) await supabase.storage.from(PRODUTOS_BUCKET).remove(produto.imagens);
  revalidar();
}
