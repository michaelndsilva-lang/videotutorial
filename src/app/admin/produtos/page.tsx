import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { precoBRL, urlImagemProduto } from "@/lib/catalogo/produtos";
import {
  CategoriaProdutoAcoes,
  NovaCategoriaProduto,
  ProdutoAcoes,
  ProdutoDialog,
} from "./produtos-admin-ui";

export default async function AdminProdutosPage() {
  await requireAdmin();
  const supabase = await createClient();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 30);

  const [
    { data: categorias },
    { data: produtos },
    { data: vinculos },
    { data: scripts },
    { data: scriptCats },
    { data: cliques },
    { count: semLoja },
  ] = await Promise.all([
    supabase.from("produto_categorias").select("id, nome, ativo, ordem").order("ordem").order("nome"),
    supabase.from("produtos").select("*").order("ordem").order("nome"),
    supabase.from("produto_scripts").select("produto_id, script_id"),
    supabase.from("scripts").select("id, titulo, categoria_id").order("titulo"),
    supabase.from("script_categorias").select("id, nome"),
    supabase.from("produto_cliques").select("produto_id").gte("created_at", inicio.toISOString()),
    supabase
      .from("membros")
      .select("usuario_id", { count: "exact", head: true })
      .eq("status", "ativo")
      .is("link_loja", null),
  ]);

  const listaCategorias = (categorias ?? []).map((c) => ({ id: c.id, nome: c.nome }));
  const nomeScriptCat = new Map((scriptCats ?? []).map((c) => [c.id, c.nome]));
  const listaScripts = (scripts ?? []).map((s) => ({
    id: s.id,
    titulo: s.titulo,
    categoria: nomeScriptCat.get(s.categoria_id) ?? "",
  }));
  const cliquesPorProduto = new Map<string, number>();
  for (const c of cliques ?? []) cliquesPorProduto.set(c.produto_id, (cliquesPorProduto.get(c.produto_id) ?? 0) + 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Catálogo"
        title="Produtos"
        description="Cadastre uma vez: aparece no painel de todos os membros e nas páginas pessoais, com o link de compra de cada um."
        actions={<ProdutoDialog categorias={listaCategorias} scripts={listaScripts} />}
      />

      {(semLoja ?? 0) > 0 && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {semLoja} membro(s) aprovado(s) ainda não preencheram o link da loja no Perfil. Para eles, o
          botão “Comprar” abre o WhatsApp do membro.
        </p>
      )}

      <NovaCategoriaProduto />

      {(categorias ?? []).map((c, ci) => {
        const itens = (produtos ?? []).filter((p) => p.categoria_id === c.id);
        return (
          <section key={c.id} className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                {c.nome}
                {!c.ativo && <Badge variant="secondary">Escondida</Badge>}
              </h2>
              <CategoriaProdutoAcoes
                id={c.id}
                nome={c.nome}
                ativo={c.ativo}
                primeiro={ci === 0}
                ultimo={ci === (categorias ?? []).length - 1}
              />
            </div>
            {itens.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-between gap-2 py-4 text-sm text-muted-foreground">
                  Nenhum produto nesta categoria.
                  <ProdutoDialog categorias={listaCategorias} scripts={listaScripts} categoriaPadrao={c.id} />
                </CardContent>
              </Card>
            ) : (
              <ul className="flex flex-col divide-y rounded-xl border">
                {itens.map((p, i) => {
                  const capa = urlImagemProduto(p.imagens[0]);
                  return (
                    <li key={p.id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${p.ativo ? "" : "opacity-60"}`}>
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {capa ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={capa} alt="" className="size-14 shrink-0 rounded-lg border object-cover" />
                        ) : (
                          <span className="size-14 shrink-0 rounded-lg border bg-muted" />
                        )}
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="flex flex-wrap items-center gap-1.5 font-medium">
                            {p.nome}
                            {p.destaque && <Badge>Destaque</Badge>}
                            {!p.ativo && <Badge variant="outline">Escondido</Badge>}
                          </span>
                          <span className="truncate text-sm text-muted-foreground">{p.descricao_curta}</span>
                          <span className="text-xs text-muted-foreground">
                            {[
                              precoBRL(p.preco_referencia),
                              `${p.imagens.length} foto(s)`,
                              `${(vinculos ?? []).filter((v) => v.produto_id === p.id).length} script(s)`,
                              `${cliquesPorProduto.get(p.id) ?? 0} clique(s) em Comprar em 30 dias`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ProdutoDialog
                          categorias={listaCategorias}
                          scripts={listaScripts}
                          produto={{
                            id: p.id,
                            categoriaId: p.categoria_id,
                            nome: p.nome,
                            descricaoCurta: p.descricao_curta,
                            descricaoCompleta: p.descricao_completa,
                            beneficios: p.beneficios,
                            modoDeUso: p.modo_de_uso,
                            imagens: p.imagens,
                            precoReferencia: p.preco_referencia,
                            destaque: p.destaque,
                            ativo: p.ativo,
                            scriptIds: (vinculos ?? []).filter((v) => v.produto_id === p.id).map((v) => v.script_id),
                          }}
                        />
                        <ProdutoAcoes
                          id={p.id}
                          nome={p.nome}
                          ativo={p.ativo}
                          destaque={p.destaque}
                          primeiro={i === 0}
                          ultimo={i === itens.length - 1}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
