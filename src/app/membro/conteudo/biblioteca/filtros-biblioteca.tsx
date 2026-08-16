import Link from "next/link";
import { cn } from "@/lib/utils";
import { OBJETIVO_LABEL, FORMATO_LABEL } from "@/lib/content/labels";
import type { ObjetivoConteudo, FormatoConteudo } from "@/lib/types/database.types";

function buildHref(atuais: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  const merged = { ...atuais, ...overrides };
  for (const [chave, valor] of Object.entries(merged)) {
    if (valor) params.set(chave, valor);
  }
  const qs = params.toString();
  return `/membro/conteudo/biblioteca${qs ? `?${qs}` : ""}`;
}

function Pill({ href, ativo, children }: { href: string; ativo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      // Sem isso, o Next reaproveita o payload prefetched do loading
      // boundary (cacheado por staleTimes.static, 5min por padrão) em vez de
      // buscar os dados filtrados de novo — confirmado em teste real: clicar
      // em "Favoritos" trocava a URL mas mantinha a lista antiga até um
      // reload completo.
      prefetch={false}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        ativo ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
    </Link>
  );
}

export function FiltrosBiblioteca({
  objetivo,
  formato,
  aba,
}: {
  objetivo?: string;
  formato?: string;
  aba?: string;
}) {
  const atuais = { objetivo, formato, aba };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        <Pill href={buildHref(atuais, { aba: undefined })} ativo={!aba}>
          Todos
        </Pill>
        <Pill href={buildHref(atuais, { aba: "favoritos" })} ativo={aba === "favoritos"}>
          Favoritos
        </Pill>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Pill href={buildHref(atuais, { objetivo: undefined })} ativo={!objetivo}>
          Todos os objetivos
        </Pill>
        {(Object.keys(OBJETIVO_LABEL) as ObjetivoConteudo[]).map((o) => (
          <Pill key={o} href={buildHref(atuais, { objetivo: o })} ativo={objetivo === o}>
            {OBJETIVO_LABEL[o]}
          </Pill>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Pill href={buildHref(atuais, { formato: undefined })} ativo={!formato}>
          Todos os formatos
        </Pill>
        {(Object.keys(FORMATO_LABEL) as FormatoConteudo[]).map((f) => (
          <Pill key={f} href={buildHref(atuais, { formato: f })} ativo={formato === f}>
            {FORMATO_LABEL[f]}
          </Pill>
        ))}
      </div>
    </div>
  );
}
