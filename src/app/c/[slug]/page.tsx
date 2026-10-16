import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { Cormorant_Garamond } from "next/font/google";
import { createAdminClient } from "@/lib/supabase/admin";
import { carregarPaginaPublica } from "@/lib/pagina/carregar";
import { APRESENTACAO_PADRAO } from "@/lib/pagina/apresentacao";
import { BioForm } from "./bio-form";
import "./bio.css";

// Página do consultor no formato "link na bio": logomarca, foto, nome,
// apresentação e formulário. O lead cai no Kanban do consultor.

const serif = Cormorant_Garamond({
  variable: "--font-bio-serif",
  subsets: ["latin"],
  weight: ["500", "600"],
});

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pagina = await carregarPaginaPublica(slug);
  if (!pagina) return { title: "Página indisponível", robots: { index: false, follow: false } };

  const titulo = `${pagina.nome} | Atlântica Natural`;
  const descricao =
    (pagina.bio || "Conheça os produtos e as oportunidades da Atlântica Natural.").replace(/\s+/g, " ").slice(0, 155);
  const imagem = pagina.fotoUrl ?? "/atlantica-natural-og.jpg";
  return {
    title: { absolute: titulo },
    description: descricao,
    // Escolha do admin (2026-10-14): páginas pessoais fora dos buscadores.
    robots: { index: false, follow: false },
    icons: { icon: "/atlantica-natural-icon.png", apple: "/atlantica-natural-icon.png" },
    openGraph: {
      type: "profile",
      title: titulo,
      description: descricao,
      url: `/c/${pagina.slug}`,
      siteName: "Atlântica Natural",
      locale: "pt_BR",
      images: [imagem],
    },
    twitter: { card: pagina.fotoUrl ? "summary" : "summary_large_image", title: titulo, images: [imagem] },
  };
}

export default async function PaginaPessoal({ params }: Props) {
  const { slug } = await params;
  const pagina = await carregarPaginaPublica(slug);
  if (!pagina) notFound();

  // Contador de visitas (melhor esforço: falha aqui não derruba a página).
  await createAdminClient()
    .rpc("registrar_visita_pagina", { p_slug: slug })
    .then(({ error }) => error && console.error("Falha ao contar visita:", error));

  const paragrafos = (pagina.bio.trim() || APRESENTACAO_PADRAO).split(/\n\s*\n/);
  const iniciais = pagina.nome
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const ordem = (i: number) => ({ "--i": i }) as CSSProperties;

  return (
    <div className={`bio-page ${serif.variable} min-h-[100dvh]`}>
      <main className="mx-auto flex w-full max-w-[30rem] flex-col items-center px-5 pt-10 pb-14 sm:pt-14">
        {/* Seção 1: logomarca */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/atlantica-natural-logo.png"
          alt="Atlântica Natural"
          width={480}
          height={585}
          className="bio-entra h-auto w-[5.5rem] sm:w-24"
          style={ordem(0)}
        />

        {/* Seção 2: foto e nome */}
        <header className="mt-10 flex flex-col items-center gap-5 text-center">
          <div className="bio-foto bio-entra" style={ordem(1)}>
            {pagina.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pagina.fotoUrl}
                alt={`Foto de ${pagina.nome}`}
                width={144}
                height={144}
                className="size-32 rounded-full border-4 border-[var(--an-ink)] object-cover sm:size-36"
              />
            ) : (
              <span
                aria-hidden
                className="bio-serif flex size-32 items-center justify-center rounded-full border-4 border-[var(--an-ink)] bg-[var(--an-surface)] text-4xl font-semibold text-[var(--an-gold)] sm:size-36"
              >
                {iniciais}
              </span>
            )}
          </div>
          <div className="bio-entra flex flex-col gap-1.5" style={ordem(2)}>
            <h1 className="bio-serif text-[2.375rem] leading-[1.05] font-semibold text-balance sm:text-[2.75rem]">
              {pagina.nome}
            </h1>
            <p className="text-sm text-[var(--an-gold)]">Consultor(a) Atlântica Natural</p>
          </div>
        </header>

        {/* Seção 3: apresentação */}
        <section
          aria-label="Apresentação"
          className="bio-entra mt-8 flex max-w-[34ch] flex-col gap-4 text-center text-[1.0625rem] leading-relaxed text-[var(--an-muted)]"
          style={ordem(3)}
        >
          {paragrafos.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </section>

        {/* Seções 4 e 5: formulário e mensagem após o envio */}
        <section
          aria-labelledby="contato-titulo"
          className="bio-painel bio-entra mt-10 flex w-full flex-col gap-6 p-6 sm:p-8"
          style={ordem(4)}
        >
          <div className="flex flex-col gap-2 text-center">
            <h2 id="contato-titulo" className="bio-serif text-[1.75rem] leading-tight font-semibold tracking-wide">
              VAMOS CONVERSAR?
            </h2>
            <p className="text-[15px] leading-relaxed text-[var(--an-muted)]">
              Preencha seus dados para que eu possa entrar em contato com você.
            </p>
          </div>
          <BioForm slug={pagina.slug} />
        </section>

        <footer className="mt-10 text-center text-xs text-[var(--an-muted)]">
          <a href="/privacidade" className="underline underline-offset-2">
            Política de Privacidade
          </a>
        </footer>
      </main>
    </div>
  );
}
