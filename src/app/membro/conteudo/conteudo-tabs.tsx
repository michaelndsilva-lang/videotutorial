"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/membro/conteudo/gerar", label: "Gerar" },
  { href: "/membro/conteudo/biblioteca", label: "Biblioteca" },
  { href: "/membro/conteudo/perfil", label: "Perfil" },
];

export function ConteudoTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            // Evita servir dados desatualizados do payload prefetched
            // (staleTimes.static reaproveita o loading boundary por 5min) —
            // ex.: gerar conteúdo e trocar pra Biblioteca não pode mostrar a
            // lista de antes da geração. Confirmado em teste real que esse
            // mesmo padrão causa staleness nos filtros da Biblioteca.
            prefetch={false}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
