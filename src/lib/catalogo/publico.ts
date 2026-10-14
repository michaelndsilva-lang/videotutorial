import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { urlImagemProduto, type ProdutoResumo } from "./produtos";

// Catálogo para as páginas públicas (sem login): só produtos ativos em
// categorias ativas, lido pelo servidor com service-role.
export const carregarCatalogoPublico = cache(async (): Promise<ProdutoResumo[]> => {
  const admin = createAdminClient();
  const [{ data: categorias }, { data: produtos }] = await Promise.all([
    admin.from("produto_categorias").select("id, nome, ordem").eq("ativo", true).order("ordem"),
    admin
      .from("produtos")
      .select("id, categoria_id, nome, descricao_curta, imagens, destaque, preco_referencia, ordem")
      .eq("ativo", true)
      .order("ordem"),
  ]);
  const ordemCat = new Map((categorias ?? []).map((c, i) => [c.id, i]));
  const nomeCat = new Map((categorias ?? []).map((c) => [c.id, c.nome]));
  return (produtos ?? [])
    .filter((p) => nomeCat.has(p.categoria_id))
    .sort(
      (a, b) =>
        (ordemCat.get(a.categoria_id) ?? 0) - (ordemCat.get(b.categoria_id) ?? 0) || a.ordem - b.ordem
    )
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      descricaoCurta: p.descricao_curta,
      categoria: nomeCat.get(p.categoria_id) ?? "",
      capa: urlImagemProduto(p.imagens[0]),
      destaque: p.destaque,
      preco: p.preco_referencia,
    }));
});

export const carregarProdutoPublico = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const admin = createAdminClient();
  const { data: p } = await admin.from("produtos").select("*").eq("id", id).eq("ativo", true).maybeSingle();
  if (!p) return null;
  const { data: cat } = await admin
    .from("produto_categorias")
    .select("nome, ativo")
    .eq("id", p.categoria_id)
    .single();
  if (!cat?.ativo) return null;
  return { ...p, categoria: cat.nome, imagensUrl: p.imagens.map((i) => urlImagemProduto(i) as string) };
});
