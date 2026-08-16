"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/conteudo/templates", label: "Templates" },
  { href: "/admin/conteudo/creditos", label: "Créditos" },
  { href: "/admin/conteudo/metricas", label: "Métricas" },
  { href: "/admin/conteudo/auditoria", label: "Auditoria" },
];

export function AdminConteudoTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          // <a> nativo, não next/link: mesmo bug confirmado nos filtros da
          // Biblioteca (revisitar uma rota já visitada nesta sessão serve o
          // payload em cache em vez de buscar de novo) — ex.: editar
          // créditos e voltar pra Métricas precisa mostrar números frescos.
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
