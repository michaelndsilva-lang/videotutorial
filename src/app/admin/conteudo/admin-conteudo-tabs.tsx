"use client";

import Link from "next/link";
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
          <Link
            key={tab.href}
            href={tab.href}
            // Evita servir dados desatualizados do payload prefetched
            // (staleTimes.static reaproveita o loading boundary por 5min) —
            // ex.: editar créditos e trocar pra Métricas não pode mostrar
            // números de antes da edição.
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
