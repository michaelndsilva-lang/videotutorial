import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Leaf, MessageCircle, Sparkles, Zap } from "lucide-react";
import { Logo } from "@/components/logo";
import { createAdminClient } from "@/lib/supabase/admin";
import { carregarPaginaPublica } from "@/lib/pagina/carregar";
import { TEXTO_CONSENTIMENTO } from "@/lib/leads/capturar";
import { LeadForm } from "./lead-form";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pagina = await carregarPaginaPublica(slug);
  return {
    title: pagina ? `${pagina.nome} · Consultor(a) Atlântica Natural` : "Página indisponível",
    description: pagina?.bio || "Fale comigo sobre os produtos e serviços da Atlântica Natural.",
    // Escolha do admin (2026-10-14): páginas pessoais fora dos buscadores.
    robots: { index: false, follow: false },
    openGraph: pagina?.fotoUrl ? { images: [pagina.fotoUrl] } : undefined,
  };
}

function linkWhats(numero: string, texto: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export default async function PaginaPessoal({ params }: Props) {
  const { slug } = await params;
  const pagina = await carregarPaginaPublica(slug);
  if (!pagina) notFound();

  // Contador de visitas (melhor esforço: falha aqui não derruba a página).
  await createAdminClient()
    .rpc("registrar_visita_pagina", { p_slug: slug })
    .then(({ error }) => error && console.error("Falha ao contar visita:", error));

  const interesses = [
    ...(pagina.mostrarOportunidade ? (["negocio"] as const) : []),
    ...(pagina.mostrarEnergia ? (["energia"] as const) : []),
    ...(pagina.mostrarProdutos ? (["produtos"] as const) : []),
  ];
  const iniciais = pagina.nome
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex max-w-xl flex-col gap-8 px-4 pt-10 pb-16">
        <header className="flex flex-col items-center gap-4 text-center">
          {pagina.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pagina.fotoUrl}
              alt={pagina.nome}
              className="size-28 rounded-full object-cover ring-4 ring-amber-500/30"
            />
          ) : (
            <span className="flex size-28 items-center justify-center rounded-full bg-amber-100 text-3xl font-semibold text-amber-800 ring-4 ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
              {iniciais}
            </span>
          )}
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-medium tracking-tight">{pagina.nome}</h1>
            <p className="text-sm text-amber-700 dark:text-amber-400">Consultor(a) Atlântica Natural</p>
          </div>
          {pagina.bio && (
            <p className="max-w-md text-sm whitespace-pre-wrap text-muted-foreground">{pagina.bio}</p>
          )}
          {pagina.whatsapp && (
            <a
              href={linkWhats(pagina.whatsapp, `Oi, ${pagina.primeiroNome}! Vim pela sua página.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <MessageCircle className="size-4" />
              Falar no WhatsApp
            </a>
          )}
        </header>

        <section className="flex flex-col gap-3">
          {pagina.mostrarOportunidade && (
            <div className="flex gap-3 rounded-2xl border p-4">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex flex-col gap-1">
                <h2 className="font-medium">Oportunidade de negócio</h2>
                <p className="text-sm text-muted-foreground">
                  Mais de 400 produtos e serviços como energia por assinatura e telemedicina. Você
                  pode vender e construir sua própria equipe, no seu ritmo. Os resultados dependem
                  da sua dedicação.
                </p>
                {pagina.linkRecrutamento && (
                  <a
                    href={pagina.linkRecrutamento}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 w-fit text-sm font-medium text-amber-700 underline underline-offset-2 dark:text-amber-400"
                  >
                    Fazer meu cadastro
                  </a>
                )}
              </div>
            </div>
          )}
          {pagina.mostrarEnergia && (
            <div className="flex gap-3 rounded-2xl border p-4">
              <Zap className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex flex-col gap-1">
                <h2 className="font-medium">Economia na conta de luz</h2>
                <p className="text-sm text-muted-foreground">
                  Energia por assinatura com desconto sobre o consumo, sem instalar placas e sem
                  investimento. Sujeito a análise da conta.
                </p>
              </div>
            </div>
          )}
          {pagina.mostrarProdutos && (
            <div className="flex gap-3 rounded-2xl border p-4">
              <Leaf className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex flex-col gap-1">
                <h2 className="font-medium">Produtos</h2>
                <p className="text-sm text-muted-foreground">
                  Cosméticos ozonizados, suplementos e perfumaria fina.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border bg-muted/20 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-lg font-medium">Quer saber mais?</h2>
            <p className="text-sm text-muted-foreground">
              Deixe seu contato e {pagina.primeiroNome} te chama no WhatsApp.
            </p>
          </div>
          <LeadForm
            slug={pagina.slug}
            primeiroNome={pagina.primeiroNome}
            interesses={interesses.length ? interesses : ["negocio"]}
            textoConsentimento={TEXTO_CONSENTIMENTO}
          />
        </section>

        <footer className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <Logo size="sm" />
          <a href="/privacidade" className="underline underline-offset-2">
            Política de Privacidade
          </a>
        </footer>
      </main>
    </div>
  );
}
