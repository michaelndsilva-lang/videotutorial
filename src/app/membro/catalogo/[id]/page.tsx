import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { GaleriaProduto } from "@/components/galeria-produto";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site-config";
import { precoBRL, urlImagemProduto } from "@/lib/catalogo/produtos";
import { CompartilharProduto, ScriptsDoProduto } from "./acoes-produto";

export default async function MembroProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireMembro();
  const supabase = await createClient();

  // RLS: produto inativo (ou membro não aprovado) não vem.
  const { data: p } = await supabase.from("produtos").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();

  const [{ data: vinculos }, { data: membro }, { data: usuario }, { data: perfil }, { data: pagina }] =
    await Promise.all([
      supabase.from("produto_scripts").select("script_id").eq("produto_id", id),
      supabase.from("membros").select("link_recrutamento, link_energia").eq("usuario_id", user.id).single(),
      supabase.from("usuarios").select("nome_completo").eq("id", user.id).single(),
      supabase.from("perfil_conteudo").select("nome_exibicao").eq("usuario_id", user.id).maybeSingle(),
      supabase.from("paginas").select("slug, publicada, mostrar_produtos").eq("membro_id", user.id).maybeSingle(),
    ]);
  const ids = (vinculos ?? []).map((v) => v.script_id);
  const { data: scripts } = ids.length
    ? await supabase.from("scripts").select("id, titulo, texto").in("id", ids).order("titulo")
    : { data: [] };

  const urlPublica =
    pagina?.publicada && pagina.mostrar_produtos ? `${SITE_URL}/c/${pagina.slug}/produto/${p.id}` : null;
  const gerar = `/membro/conteudo/gerar?objetivo=venda_produto&tema=${encodeURIComponent(p.nome)}`;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/membro/catalogo" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Catálogo
      </Link>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GaleriaProduto imagens={p.imagens.map((i) => urlImagemProduto(i) as string)} nome={p.nome} />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-medium tracking-tight">{p.nome}</h1>
            {p.descricao_curta && <p className="text-muted-foreground">{p.descricao_curta}</p>}
            {p.preco_referencia != null && (
              <p className="text-xl font-semibold tabular-nums">{precoBRL(p.preco_referencia)}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={gerar} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Sparkles className="size-4" />
              Gerar conteúdo deste produto
            </Link>
          </div>
          {urlPublica ? (
            <CompartilharProduto url={urlPublica} nome={p.nome} />
          ) : (
            <p className="text-xs text-muted-foreground">
              Para compartilhar o link do produto, publique sua página com a seção Produtos em{" "}
              <Link href="/membro/minha-pagina" className="underline underline-offset-2">Minha página</Link>.
            </p>
          )}
          {p.descricao_completa && <p className="text-sm whitespace-pre-wrap">{p.descricao_completa}</p>}
          {p.beneficios.length > 0 && (
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-medium">Benefícios</h2>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                {p.beneficios.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </div>
          )}
          {p.modo_de_uso && (
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-medium">Modo de uso</h2>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{p.modo_de_uso}</p>
            </div>
          )}
        </div>
      </div>
      {(scripts ?? []).length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-medium">Scripts para vender</h2>
          <ScriptsDoProduto
            scripts={scripts ?? []}
            valores={{
              meuNome: perfil?.nome_exibicao || usuario?.nome_completo || "",
              meuLink: membro?.link_recrutamento ?? "",
              linkEnergia: membro?.link_energia ?? "",
            }}
          />
        </section>
      )}
    </div>
  );
}
