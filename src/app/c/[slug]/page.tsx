import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { Cormorant_Garamond } from "next/font/google";
import {
  BookOpen,
  Check,
  ChevronDown,
  GraduationCap,
  Handshake,
  Megaphone,
  ShoppingBag,
  Users,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { carregarPaginaPublica } from "@/lib/pagina/carregar";
import { APRESENTACAO_PADRAO } from "@/lib/pagina/apresentacao";
import { GUIA_PRODUTOS_URL, VIDEO_APRESENTACAO_ID } from "@/lib/pagina/captura";
import { BioForm } from "./bio-form";
import { VideoApresentacao } from "./video-apresentacao";
import { CtaFixo } from "./cta-fixo";
import "./bio.css";

// Página de captura do consultor: apresentação de negócio em vídeo, guia de
// produtos, motivos para entrar e formulário. O lead cai no Kanban dele.
// Textos seguem as "Informações oficiais" do Mentor IA: nada de promessa de
// ganho; exemplos de valores sempre marcados como ilustrativos.

const serif = Cormorant_Garamond({
  variable: "--font-bio-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const SERVICOS = [
  "Energia por assinatura",
  "Telemedicina",
  "Internet",
  "Streaming",
  "Agência de viagem",
  "Consórcios",
  "Seguros",
];

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pagina = await carregarPaginaPublica(slug);
  if (!pagina) return { title: "Página indisponível", robots: { index: false, follow: false } };

  const titulo = `${pagina.nome} | Atlântica Natural`;
  const descricao = `Assista à apresentação de negócio da Atlântica Natural e fale com ${pagina.primeiroNome} para começar.`;
  const imagem = pagina.fotoUrl ?? "/atlantica-natural-og.jpg";
  return {
    title: { absolute: titulo },
    description: descricao,
    // Escolha do admin (2026-10-14): páginas pessoais fora dos buscadores.
    robots: { index: false, follow: false },
    icons: { icon: "/atlantica-natural-icon.png", apple: "/atlantica-natural-icon.png" },
    openGraph: {
      type: "website",
      title: titulo,
      description: descricao,
      url: `/c/${pagina.slug}`,
      siteName: "Atlântica Natural",
      locale: "pt_BR",
      images: ["/apresentacao-negocio-capa.jpg"],
    },
    twitter: { card: "summary_large_image", title: titulo, images: [imagem] },
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

  const nome = pagina.nome;
  const primeiro = pagina.primeiroNome;
  const paragrafos = (pagina.bio.trim() || APRESENTACAO_PADRAO).split(/\n\s*\n/);
  const iniciais = nome
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const ordem = (i: number) => ({ "--i": i }) as CSSProperties;

  const foto = (tamanho: string) =>
    pagina.fotoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={pagina.fotoUrl}
        alt={`Foto de ${nome}`}
        className={`${tamanho} rounded-full border-2 border-[var(--an-ink)] object-cover`}
      />
    ) : (
      <span
        aria-hidden
        className={`${tamanho} bio-serif flex items-center justify-center rounded-full border-2 border-[var(--an-ink)] bg-[var(--an-surface)] font-semibold text-[var(--an-gold)]`}
      >
        {iniciais}
      </span>
    );

  return (
    <div className={`bio-page ${serif.variable} min-h-[100dvh]`}>
      {/* Topo: marca + quem convidou */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 pt-5 sm:pt-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/atlantica-natural-logo.png"
          alt="Atlântica Natural"
          width={480}
          height={585}
          className="h-auto w-11 sm:w-12"
        />
        <div className="flex items-center gap-3 text-right">
          <span className="text-[13px] leading-tight text-[var(--an-muted)]">
            Convite de
            <span className="block text-[15px] font-semibold text-[var(--an-text)]">{nome}</span>
          </span>
          <span className="bio-foto shrink-0 p-[2px]">
            {foto("size-11 text-base")}
          </span>
        </div>
      </header>

      <main>
        {/* Abertura + vídeo */}
        <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-5 pt-10 text-center sm:pt-14">
          <h1
            className="bio-serif bio-entra max-w-[19ch] text-[2.5rem] leading-[1.05] font-bold text-balance sm:text-6xl"
            style={ordem(0)}
          >
            Seu próprio negócio com mais de <span className="text-[var(--an-gold)]">400 produtos</span> para
            vender
          </h1>
          <p
            className="bio-entra mt-5 max-w-[46ch] text-[1.0625rem] leading-relaxed text-[var(--an-muted)] sm:text-lg"
            style={ordem(1)}
          >
            Aperte o play, conheça a Atlântica Natural e veja como começar com o apoio de {primeiro}.
          </p>
          <div className="bio-entra mt-8 w-full" style={ordem(2)}>
            <VideoApresentacao
              videoId={VIDEO_APRESENTACAO_ID}
              capa="/apresentacao-negocio-capa.jpg"
              titulo="Apresentação de negócio Atlântica Natural"
              ctaHref="#cadastro"
            />
          </div>
          <a id="cta-abertura" href="#cadastro" className="bio-botao bio-entra mt-8 w-full px-8 sm:w-auto" style={ordem(3)}>
            QUERO FAZER PARTE
          </a>
        </section>

        {/* Guia de produtos */}
        <section className="mx-auto mt-24 grid w-full max-w-5xl grid-cols-1 items-center gap-10 px-5 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-14">
          <a
            href={GUIA_PRODUTOS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="captura-guia group mx-auto block w-[68%] max-w-[300px] md:w-full"
            aria-label="Abrir o Guia de Produtos em nova aba"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/guia-produtos-capa.jpg"
              alt="Capa do Guia de Produtos Atlântica Natural, 12ª edição 2026"
              width={777}
              height={1100}
              loading="lazy"
              className="h-auto w-full rounded-[10px]"
            />
          </a>
          <div className="flex flex-col items-center gap-5 text-center md:items-start md:text-left">
            <h2 className="bio-serif text-4xl leading-[1.1] font-bold text-balance sm:text-5xl">
              Produtos que as pessoas já usam todos os dias
            </h2>
            <p className="max-w-[46ch] text-[1.0625rem] leading-relaxed text-[var(--an-muted)]">
              Cosméticos ozonizados, suplementos e perfumaria fina. Folheie o guia oficial e imagine o que você
              venderia primeiro.
            </p>
            <a
              href={GUIA_PRODUTOS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="captura-botao-linha inline-flex items-center gap-2"
            >
              <BookOpen aria-hidden className="size-5" strokeWidth={1.75} />
              Abrir o guia de produtos
            </a>
          </div>
        </section>

        {/* Duas formas de ganhar */}
        <section className="mx-auto mt-28 w-full max-w-5xl px-5">
          <h2 className="bio-serif mx-auto max-w-[20ch] text-center text-4xl leading-[1.1] font-bold text-balance sm:text-5xl">
            Duas formas de construir sua renda
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            <article className="bio-painel flex flex-col gap-4 p-7 sm:p-9">
              <ShoppingBag aria-hidden className="size-8 text-[var(--an-gold)]" strokeWidth={1.5} />
              <h3 className="text-xl font-semibold">Venda direta</h3>
              <p className="leading-relaxed text-[var(--an-muted)]">
                Você compra a preço de consultor e revende para clientes, amigos e família.
              </p>
              <div className="mt-auto rounded-xl border border-[var(--an-line)] bg-[var(--an-ink)] p-5">
                <p className="text-[13px] text-[var(--an-muted)]">Perfume de 15 ml, exemplo ilustrativo</p>
                <div className="mt-3 grid grid-cols-2 items-end gap-4">
                  <span>
                    <span className="block text-[13px] text-[var(--an-muted)]">Você paga</span>
                    <span className="bio-serif text-[1.75rem] font-bold whitespace-nowrap sm:text-3xl">R$ 19,99</span>
                  </span>
                  <span>
                    <span className="block text-[13px] text-[var(--an-muted)]">Revende por cerca de</span>
                    <span className="bio-serif text-[1.75rem] font-bold whitespace-nowrap text-[var(--an-gold)] sm:text-3xl">
                      R$ 40,00
                    </span>
                  </span>
                </div>
              </div>
            </article>
            <article className="captura-painel-ouro flex flex-col gap-4 p-7 sm:p-9">
              <Users aria-hidden className="size-8 text-[var(--an-gold)]" strokeWidth={1.5} />
              <h3 className="text-xl font-semibold">Sua equipe</h3>
              <p className="leading-relaxed text-[var(--an-muted)]">
                Apresente o negócio para outras pessoas, monte sua equipe de consultores e receba pelo plano de
                marketing da empresa.
              </p>
              <p className="mt-auto border-t border-[var(--an-line)] pt-5 leading-relaxed">
                Você ajuda outras pessoas a começar e é remunerado conforme as regras do plano.
              </p>
            </article>
          </div>
          <p className="mx-auto mt-6 max-w-[60ch] text-center text-[13px] leading-relaxed text-[var(--an-muted)]">
            Os resultados dependem da dedicação e do trabalho de cada um. Não existe ganho garantido.
          </p>
        </section>

        {/* Entrada */}
        <section className="mx-auto mt-28 w-full max-w-5xl px-5">
          <div className="captura-oferta grid grid-cols-1 items-center gap-8 p-8 sm:p-12 md:grid-cols-[auto_1fr] md:gap-14">
            <div className="text-center md:text-left">
              <p className="text-[15px] text-[var(--an-muted)]">Para começar</p>
              <p className="bio-serif text-6xl leading-none font-bold text-[var(--an-gold)] sm:text-7xl">R$ 79,90</p>
              <p className="mt-2 text-[15px] text-[var(--an-muted)]">em produtos para você</p>
            </div>
            <div className="flex flex-col gap-5">
              <ul className="flex flex-col gap-3.5">
                {[
                  "Você escolhe os produtos do seu primeiro pedido",
                  "Tudo já com 50% de desconto de consultor",
                  "Libera todas as formas de ganho do plano de carreira",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[1.0625rem] leading-snug">
                    <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-[var(--an-gold)]" strokeWidth={2.25} />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-[14px] leading-relaxed text-[var(--an-muted)]">
                Também existe a Licença Anual, com comissão todo mês sobre os serviços vendidos. {primeiro} te
                explica qual opção combina com você.
              </p>
            </div>
          </div>
        </section>

        {/* Serviços */}
        <section className="mx-auto mt-24 flex w-full max-w-4xl flex-col items-center gap-7 px-5 text-center">
          <h2 className="bio-serif max-w-[22ch] text-3xl leading-[1.15] font-bold text-balance sm:text-4xl">
            Além dos produtos, serviços que todo mundo precisa
          </h2>
          <ul className="flex flex-wrap justify-center gap-2.5">
            {SERVICOS.map((s) => (
              <li
                key={s}
                className="rounded-full border border-[var(--an-line)] bg-[var(--an-surface)] px-4 py-2 text-[15px]"
              >
                {s}
              </li>
            ))}
          </ul>
        </section>

        {/* Apoio da equipe */}
        <section className="mx-auto mt-28 grid w-full max-w-5xl grid-cols-1 gap-10 px-5 md:grid-cols-2 md:items-center md:gap-14">
          <div className="flex flex-col gap-5 text-center md:text-left">
            <h2 className="bio-serif text-4xl leading-[1.1] font-bold text-balance sm:text-5xl">
              Você não começa sozinho
            </h2>
            <p className="text-[1.0625rem] leading-relaxed text-[var(--an-muted)]">
              Ao entrar pela equipe de {primeiro}, você recebe acesso à nossa plataforma de trabalho e acompanhamento
              desde o primeiro dia.
            </p>
          </div>
          <ul className="flex flex-col divide-y divide-[var(--an-line)] border-y border-[var(--an-line)]">
            {[
              { icon: Handshake, texto: `Acompanhamento de ${primeiro}, que te ajuda nos primeiros passos` },
              { icon: GraduationCap, texto: "Treinamentos em vídeo para aprender no seu ritmo" },
              { icon: Megaphone, texto: "Materiais de divulgação prontos para usar" },
              { icon: Users, texto: "Uma página como esta, com o seu nome, para divulgar" },
            ].map(({ icon: Icon, texto }) => (
              <li key={texto} className="flex items-center gap-4 py-4">
                <Icon aria-hidden className="size-6 shrink-0 text-[var(--an-gold)]" strokeWidth={1.5} />
                <span className="text-[1.0625rem] leading-snug">{texto}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Como funciona */}
        <section className="mx-auto mt-28 w-full max-w-5xl px-5">
          <h2 className="bio-serif text-center text-4xl leading-[1.1] font-bold sm:text-5xl">Como funciona</h2>
          <ol className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
            {[
              ["Deixe seus dados", "Leva menos de um minuto, no formulário logo abaixo."],
              [`${primeiro} te chama no WhatsApp`, "Para tirar suas dúvidas e explicar cada detalhe."],
              ["Faça seu cadastro", "E monte seu primeiro pedido com os produtos que escolher."],
            ].map(([titulo, texto], i) => (
              <li key={titulo} className="flex gap-4 md:flex-col md:gap-3">
                <span className="bio-serif flex size-12 shrink-0 items-center justify-center rounded-full border border-[var(--an-gold)] text-2xl font-bold text-[var(--an-gold)]">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-lg font-semibold">{titulo}</span>
                  <span className="mt-1 block leading-relaxed text-[var(--an-muted)]">{texto}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* Dúvidas */}
        <section className="mx-auto mt-28 w-full max-w-3xl px-5">
          <h2 className="bio-serif text-center text-4xl leading-[1.1] font-bold sm:text-5xl">Dúvidas comuns</h2>
          <div className="mt-8 flex flex-col gap-3">
            {[
              [
                "É pirâmide?",
                "Não. A Atlântica Natural trabalha com Marketing de Rede, um modelo legal baseado na venda de produtos e serviços reais. Toda remuneração segue as regras do plano de marketing da empresa.",
              ],
              [
                "Quanto eu vou ganhar?",
                "Depende da sua dedicação e do seu trabalho. Não existe ganho garantido. Você pode ganhar vendendo produtos e construindo sua equipe.",
              ],
              [
                "Quanto preciso para começar?",
                "A adesão simples é um pedido mínimo de R$ 79,90 com os produtos que você escolher, já com 50% de desconto.",
              ],
              [
                "Como faço meu primeiro pedido?",
                `Pelo escritório virtual da Atlântica Natural. ${primeiro} te acompanha no passo a passo.`,
              ],
            ].map(([pergunta, resposta]) => (
              <details key={pergunta} className="captura-faq group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[1.0625rem] font-semibold">
                  {pergunta}
                  <ChevronDown
                    aria-hidden
                    className="size-5 shrink-0 text-[var(--an-gold)] transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="px-5 pb-5 leading-relaxed text-[var(--an-muted)]">{resposta}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Formulário */}
        <section id="cadastro" className="mx-auto mt-28 w-full max-w-[32rem] scroll-mt-6 px-5">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="bio-foto p-[3px]">
              {foto("size-24 text-3xl")}
            </span>
            <div>
              <p className="bio-serif text-3xl font-bold">{nome}</p>
              <p className="text-sm text-[var(--an-gold)]">Consultor(a) Atlântica Natural</p>
            </div>
            <div className="flex max-w-[38ch] flex-col gap-3 leading-relaxed text-[var(--an-muted)]">
              {paragrafos.map((p, i) => (
                <p key={i} className="whitespace-pre-line">
                  {p}
                </p>
              ))}
            </div>
          </div>
          <div className="bio-painel mt-8 flex flex-col gap-6 p-6 sm:p-8">
            <div className="flex flex-col gap-2 text-center">
              <h2 className="bio-serif text-[2rem] leading-tight font-bold tracking-wide">VAMOS CONVERSAR?</h2>
              <p className="text-[15px] leading-relaxed text-[var(--an-muted)]">
                Preencha seus dados para que eu possa entrar em contato com você.
              </p>
            </div>
            <BioForm slug={pagina.slug} />
          </div>
        </section>
      </main>

      <footer className="mx-auto mt-16 flex w-full max-w-3xl flex-col items-center gap-3 px-5 pb-28 text-center text-xs leading-relaxed text-[var(--an-muted)] md:pb-12">
        <p>
          {nome} é consultor(a) independente da Atlântica Natural. Os resultados dependem da dedicação de cada um.
        </p>
        <a href="/privacidade" className="underline underline-offset-2">
          Política de Privacidade
        </a>
      </footer>

      <CtaFixo />
    </div>
  );
}
