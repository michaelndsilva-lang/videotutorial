import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { GaleriaProduto } from "@/components/galeria-produto";
import { Logo } from "@/components/logo";
import { carregarPaginaPublica } from "@/lib/pagina/carregar";
import { carregarProdutoPublico } from "@/lib/catalogo/publico";
import { precoBRL } from "@/lib/catalogo/produtos";
import { TEXTO_CONSENTIMENTO } from "@/lib/leads/capturar";
import { LeadForm } from "../../lead-form";

type Props = { params: Promise<{ slug: string; id: string }> };

async function carregar(slug: string, id: string) {
  const pagina = await carregarPaginaPublica(slug);
  if (!pagina?.mostrarProdutos) return null;
  const produto = await carregarProdutoPublico(id);
  return produto ? { pagina, produto } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const dados = await carregar(slug, id);
  return {
    title: dados ? `${dados.produto.nome} · ${dados.pagina.nome}` : "Produto indisponível",
    description: dados?.produto.descricao_curta,
    robots: { index: false, follow: false },
    openGraph: dados?.produto.imagensUrl[0] ? { images: [dados.produto.imagensUrl[0]] } : undefined,
  };
}

export default async function ProdutoPublicoPage({ params }: Props) {
  const { slug, id } = await params;
  const dados = await carregar(slug, id);
  if (!dados) notFound();
  const { pagina, produto: p } = dados;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 bg-background px-4 pt-8 pb-16">
      <Link href={`/c/${slug}/produtos`} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Produtos de {pagina.primeiroNome}
      </Link>
      <GaleriaProduto imagens={p.imagensUrl} nome={p.nome} />
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-amber-700 uppercase dark:text-amber-400">{p.categoria}</span>
        <h1 className="font-heading text-2xl font-medium tracking-tight">{p.nome}</h1>
        {p.descricao_curta && <p className="text-muted-foreground">{p.descricao_curta}</p>}
        {p.preco_referencia != null && <p className="pt-1 text-xl font-semibold tabular-nums">{precoBRL(p.preco_referencia)}</p>}
      </div>
      <a href={`/c/${slug}/produto/${p.id}/comprar`} className={buttonVariants({ size: "lg" })}>
        <ShoppingBag className="size-4" />
        Comprar
      </a>
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
      <section className="flex flex-col gap-4 rounded-2xl border bg-muted/20 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg font-medium">Ficou com dúvida?</h2>
          <p className="text-sm text-muted-foreground">
            Deixe seu contato e {pagina.primeiroNome} te chama no WhatsApp sobre este produto.
          </p>
        </div>
        <LeadForm
          slug={slug}
          primeiroNome={pagina.primeiroNome}
          interesses={["produtos"]}
          textoConsentimento={TEXTO_CONSENTIMENTO}
          produtoId={p.id}
          textoBotao="Tenho interesse"
        />
      </section>
      <footer className="flex flex-col items-center gap-2 pt-4 text-xs text-muted-foreground">
        <Logo size="sm" />
        <a href="/privacidade" className="underline underline-offset-2">Política de Privacidade</a>
      </footer>
    </main>
  );
}
