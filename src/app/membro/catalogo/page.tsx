import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { urlImagemProduto, type ProdutoResumo } from "@/lib/catalogo/produtos";
import { CatalogoBrowser } from "@/components/catalogo-browser";

export default async function MembroCatalogoPage() {
  const user = await requireMembro();
  const supabase = await createClient();

  // RLS: só produtos ativos de categorias ativas, e só para membro aprovado.
  const [{ data: categorias }, { data: produtos }, { data: membro }] = await Promise.all([
    supabase.from("produto_categorias").select("id, nome").order("ordem"),
    supabase
      .from("produtos")
      .select("id, categoria_id, nome, descricao_curta, imagens, destaque, preco_referencia")
      .order("ordem"),
    supabase.from("membros").select("link_loja").eq("usuario_id", user.id).single(),
  ]);

  const nomeCat = new Map((categorias ?? []).map((c) => [c.id, c.nome]));
  const ordemCat = new Map((categorias ?? []).map((c, i) => [c.id, i]));
  const lista: ProdutoResumo[] = (produtos ?? [])
    .filter((p) => nomeCat.has(p.categoria_id))
    .sort((a, b) => (ordemCat.get(a.categoria_id) ?? 0) - (ordemCat.get(b.categoria_id) ?? 0))
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      descricaoCurta: p.descricao_curta,
      categoria: nomeCat.get(p.categoria_id) ?? "",
      capa: urlImagemProduto(p.imagens[0]),
      destaque: p.destaque,
      preco: p.preco_referencia,
    }));
  const categoriasComProduto = (categorias ?? []).map((c) => c.nome).filter((n) => lista.some((p) => p.categoria === n));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Vitrine"
        title="Catálogo"
        description="Produtos oficiais com scripts de venda. Compartilhe com seus contatos: a compra vai para o seu link."
      />
      {!membro?.link_loja && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          Você ainda não cadastrou o link da sua loja. Sem ele, o botão “Comprar” na sua página abre o
          seu WhatsApp.{" "}
          <Link href="/membro/perfil" className="font-medium underline underline-offset-2">
            Cadastrar no Perfil
          </Link>
        </p>
      )}
      {lista.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catálogo em preparação</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Assim que o administrador cadastrar os produtos, eles aparecem aqui.
          </CardContent>
        </Card>
      ) : (
        <CatalogoBrowser produtos={lista} categorias={categoriasComProduto} hrefBase="/membro/catalogo" />
      )}
    </div>
  );
}
