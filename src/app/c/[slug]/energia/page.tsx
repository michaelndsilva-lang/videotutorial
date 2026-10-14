import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { carregarPaginaPublica } from "@/lib/pagina/carregar";
import { carregarConfigSimulador } from "@/lib/energia/proposta";
import { TEXTO_CONSENTIMENTO } from "@/lib/leads/capturar";
import { SimuladorPublico } from "./simulador-publico";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pagina = await carregarPaginaPublica(slug);
  return {
    title: pagina ? `Simule sua economia na conta de luz · ${pagina.nome}` : "Página indisponível",
    robots: { index: false, follow: false },
  };
}

export default async function SimuladorPublicoPage({ params }: Props) {
  const { slug } = await params;
  const pagina = await carregarPaginaPublica(slug);
  if (!pagina?.mostrarEnergia) notFound();
  const config = await carregarConfigSimulador();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 bg-background px-4 pt-8 pb-16">
      <Link
        href={`/c/${slug}`}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {pagina.nome}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Quanto você economiza na conta de luz?
        </h1>
        <p className="text-sm text-muted-foreground">
          Energia por assinatura: desconto sobre o consumo, sem instalar placas e sem investimento.
        </p>
      </div>
      <SimuladorPublico
        slug={slug}
        primeiroNome={pagina.primeiroNome}
        config={config}
        textoConsentimento={TEXTO_CONSENTIMENTO}
      />
      <footer className="mt-auto flex flex-col items-center gap-2 pt-8 text-xs text-muted-foreground">
        <Logo size="sm" />
        <a href="/privacidade" className="underline underline-offset-2">
          Política de Privacidade
        </a>
      </footer>
    </main>
  );
}
