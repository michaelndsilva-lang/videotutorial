import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { carregarPaginaPublica } from "@/lib/pagina/carregar";
import { carregarCatalogoPublico } from "@/lib/catalogo/publico";
import { CatalogoBrowser } from "@/components/catalogo-browser";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pagina = await carregarPaginaPublica(slug);
  return {
    title: pagina ? `Produtos · ${pagina.nome}` : "Página indisponível",
    robots: { index: false, follow: false },
  };
}

export default async function ProdutosPublicosPage({ params }: Props) {
  const { slug } = await params;
  const pagina = await carregarPaginaPublica(slug);
  if (!pagina?.mostrarProdutos) notFound();
  const produtos = await carregarCatalogoPublico();
  const categorias = Array.from(new Set(produtos.map((p) => p.categoria)));

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 bg-background px-4 pt-8 pb-16">
      <Link href={`/c/${slug}`} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {pagina.nome}
      </Link>
      <h1 className="font-heading text-2xl font-medium tracking-tight">Produtos</h1>
      {produtos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Em breve.</p>
      ) : (
        <CatalogoBrowser produtos={produtos} categorias={categorias} hrefBase={`/c/${slug}/produto`} />
      )}
      <footer className="mt-auto flex flex-col items-center gap-2 pt-8 text-xs text-muted-foreground">
        <Logo size="sm" />
        <a href="/privacidade" className="underline underline-offset-2">Política de Privacidade</a>
      </footer>
    </main>
  );
}
