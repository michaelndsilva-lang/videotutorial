import type { Metadata } from "next";
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  Package,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { YoutubeFacade } from "@/components/youtube-facade";
import { PROSPECCAO_PATH, SITE_URL } from "@/lib/site-config";

const TITLE =
  "Seja Consultora Atlântica Natural | Marketing de Rede com R$79,96";
const DESCRIPTION =
  "Quer trabalhar com marketing de rede e venda direta de perfumes? Torne-se consultora(or) Atlântica Natural investindo apenas R$79,96 em 4 perfumes e fique com 100% do lucro na revenda. Sem experiência, sem taxa mensal.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "Atlântica Natural",
    "seja consultora Atlântica Natural",
    "marketing de rede",
    "venda direta de perfumes",
    "marketing multinível",
    "renda extra vendendo perfume",
    "kit inicial de perfumes para revenda",
    "como ser consultora de perfumes",
  ],
  alternates: {
    canonical: PROSPECCAO_PATH,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PROSPECCAO_PATH,
    siteName: "Atlântica Natural",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const FAQ_ITEMS = [
  {
    q: "Preciso ter experiência com vendas?",
    a: "Não. A equipe te orienta desde o primeiro contato, do zero.",
  },
  {
    q: "E se eu não vender tudo rápido?",
    a: "Perfume não é um produto que vence como outros — você vende no seu tempo, sem pressa.",
  },
  {
    q: "Preciso ter loja ou estoque grande?",
    a: "Não. Você começa com um kit pequeno e reinveste conforme for vendendo.",
  },
  {
    q: "Como recebo os produtos?",
    a: "Fale com a equipe pelo WhatsApp — combinamos juntos a forma mais prática pra você.",
  },
] as const;

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: {
      "@type": "Answer",
      text: a,
    },
  })),
};

const WHATSAPP_NUMBER = "5584991563744";
const WHATSAPP_MESSAGE =
  "Olá! Vi o anúncio e quero garantir meu kit de 4 perfumes por R$79,96 pra começar como consultora(or) da Atlântica Natural.";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
const VIDEO_ID = "rx4rIIrTJDo";

function WhatsappCta({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}

export default function ProspeccaoPage() {
  return (
    <div className="dark min-h-screen bg-background font-sans text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="font-heading text-sm font-semibold tracking-[0.25em] text-transparent bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 bg-clip-text sm:text-base">
            ATLÂNTICA NATURAL
          </span>
          <WhatsappCta className="hidden items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 transition-transform hover:scale-105 sm:inline-flex">
            <MessageCircle className="size-4" />
            Falar com a equipe
          </WhatsappCta>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden px-4 pb-14 pt-12 sm:px-6 sm:pt-16">
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-40"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, rgba(232,196,119,0.18), transparent)",
            }}
          />
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-medium tracking-wide text-amber-300 sm:text-sm">
              <Sparkles className="size-3.5" />
              Seja consultora(or) Atlântica Natural
            </p>
            <h1 className="font-heading text-3xl font-semibold leading-tight text-balance sm:text-4xl md:text-5xl">
              Comece seu negócio investindo apenas{" "}
              <span className="text-transparent bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 bg-clip-text">
                R$ 79,96
              </span>{" "}
              (4 perfumes) e tenha{" "}
              <span className="text-transparent bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 bg-clip-text">
                100% de lucro
              </span>{" "}
              na venda direta
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
              Sem estoque parado, sem taxa mensal e sem precisar de experiência.
              Você garante o kit inicial, revende para quem já confia em você e
              fica com o lucro inteiro — sem repassar comissão pra ninguém.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              <WhatsappCta className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-8 py-4 text-base font-semibold text-black shadow-xl shadow-amber-500/30 transition-transform hover:scale-105">
                <MessageCircle className="size-5" />
                Quero garantir meu kit agora
              </WhatsappCta>
              <span className="text-xs text-muted-foreground">
                Kits limitados por lote — fale agora com a equipe
              </span>
            </div>

            <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-amber-400" />
                Sem experiência necessária
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-amber-400" />
                Comece hoje
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-amber-400" />
                Lucro direto no seu bolso
              </span>
            </div>
          </div>
        </section>

        {/* VÍDEO */}
        <section className="px-4 pb-16 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-4 text-center font-heading text-xl font-semibold sm:text-2xl">
              Assista e entenda como funciona em 2 minutos
            </h2>
            <YoutubeFacade
              videoId={VIDEO_ID}
              title="Como funciona a Atlântica Natural"
            />
          </div>
        </section>

        {/* DOR / AGITAÇÃO */}
        <section className="border-t border-white/10 bg-white/[0.02] px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-semibold text-balance sm:text-3xl">
              Cansada(o) de uma rotina em que o dinheiro nunca sobra?
            </h2>
            <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
              {[
                "Horário fixo, sem flexibilidade pra cuidar da família ou dos seus projetos.",
                "Depender de um único salário e não ter uma segunda fonte de renda.",
                "Vontade de empreender, mas medo de investir alto e não recuperar o dinheiro.",
              ].map((text) => (
                <div
                  key={text}
                  className="rounded-xl border border-white/10 bg-background/40 p-4 text-sm text-muted-foreground"
                >
                  {text}
                </div>
              ))}
            </div>
            <p className="mt-8 text-balance text-base text-foreground sm:text-lg">
              A Atlântica Natural resolve isso com{" "}
              <span className="font-semibold text-amber-300">
                um dos menores investimentos iniciais do mercado de perfumaria
              </span>
              .
            </p>
          </div>
        </section>

        {/* OFERTA */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-8 text-center font-heading text-2xl font-semibold sm:text-3xl">
              O que você recebe por R$ 79,96
            </h2>
            <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-b from-amber-400/[0.06] to-transparent p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
                  <Package className="size-6" />
                </span>
                <div>
                  <p className="font-semibold">Kit inicial com 4 perfumes</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Produtos prontos pra revender — sem precisar comprar caixa
                    fechada nem montar estoque grande pra começar.
                  </p>
                </div>
              </div>

              <div className="my-6 h-px bg-white/10" />

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Você investe
                  </p>
                  <p className="mt-1 font-heading text-2xl font-semibold text-foreground">
                    R$ 79,96
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Você revende
                  </p>
                  <p className="mt-1 font-heading text-2xl font-semibold text-foreground">
                    pelo preço de tabela
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wide text-amber-300">
                    Seu lucro
                  </p>
                  <p className="mt-1 font-heading text-2xl font-semibold text-amber-300">
                    100%
                  </p>
                </div>
              </div>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                A cada kit vendido, você recupera o que investiu e ainda dobra
                seu dinheiro — o lucro é todo seu, sem repassar comissão pra
                ninguém.
              </p>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section className="border-t border-white/10 bg-white/[0.02] px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-10 text-center font-heading text-2xl font-semibold sm:text-3xl">
              Como funciona
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: Wallet,
                  title: "1. Garanta seu kit",
                  text: "Fale com a equipe pelo WhatsApp e garanta seu kit inicial com 4 perfumes por R$79,96.",
                },
                {
                  icon: Users,
                  title: "2. Comece a revender",
                  text: "Ofereça pra família, amigos e nas redes sociais. Sem loja física, sem estoque grande.",
                },
                {
                  icon: TrendingUp,
                  title: "3. Lucre e repita",
                  text: "O valor da venda é seu. Reinvista, cresça seu catálogo e construa sua renda no seu tempo.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="text-center">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DIFERENCIAIS */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-3 text-center font-heading text-2xl font-semibold sm:text-3xl">
              Por que Atlântica Natural
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-center text-sm text-muted-foreground">
              Se você busca uma oportunidade em marketing de rede, marketing
              multinível ou venda direta, a Atlântica Natural é um ponto de
              partida acessível pra começar com pouco investimento.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Sparkles,
                  title: "Perfumaria de qualidade",
                  text: "Produtos com boa aceitação e preço acessível pra girar rápido.",
                },
                {
                  icon: ShieldCheck,
                  title: "Marca consolidada",
                  text: "Venda direta com histórico no mercado, não é algo recém-criado.",
                },
                {
                  icon: Users,
                  title: "Você não começa sozinha(o)",
                  text: "Tem uma equipe real de apoio por trás de você, do primeiro contato em diante.",
                },
                {
                  icon: Clock,
                  title: "Flexibilidade total",
                  text: "Sem hora pra bater ponto e sem meta obrigatória. Você decide seu ritmo.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-background/40 p-4"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
                    <Icon className="size-4.5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROVA SOCIAL GENÉRICA */}
        <section className="border-t border-white/10 bg-white/[0.02] px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-semibold text-balance sm:text-3xl">
              Centenas de pessoas já começaram do zero
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-balance text-muted-foreground">
              Muitas delas sem nenhuma experiência prévia em vendas — só com
              vontade de ter uma renda extra e o apoio certo pra dar o
              primeiro passo.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-8 text-center font-heading text-2xl font-semibold sm:text-3xl">
              Perguntas frequentes
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map(({ q, a }) => (
                <div
                  key={q}
                  className="rounded-xl border border-white/10 bg-background/40 p-4"
                >
                  <h3 className="font-semibold">{q}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="border-t border-white/10 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-heading text-2xl font-semibold text-balance sm:text-3xl">
              Seu negócio pode começar hoje, com menos de R$ 80
            </h2>
            <p className="mt-3 text-muted-foreground">
              Fale agora com a equipe e tire suas dúvidas antes de decidir.
            </p>
            <WhatsappCta className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-8 py-4 text-base font-semibold text-black shadow-xl shadow-amber-500/30 transition-transform hover:scale-105">
              <MessageCircle className="size-5" />
              Quero garantir meu kit agora
            </WhatsappCta>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-muted-foreground sm:px-6">
        Atlântica Natural — Venda direta. Resultados podem variar conforme
        dedicação e região.
      </footer>

      {/* CTA fixo mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/95 p-3 backdrop-blur sm:hidden">
        <WhatsappCta className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-amber-500/30">
          <MessageCircle className="size-4" />
          Quero garantir meu kit agora
        </WhatsappCta>
      </div>
      <div className="h-16 sm:hidden" />
    </div>
  );
}
