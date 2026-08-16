"use client";

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
          // <a> nativo, não next/link: revisitar uma rota já visitada nesta
          // sessão (ex. Gerar → Biblioteca → Gerar → gera de novo →
          // Biblioteca) pode servir o payload em cache em vez de buscar de
          // novo — confirmado com o mesmo padrão nos filtros da Biblioteca.
          <a
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
