"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Bot,
  Settings,
  KanbanSquare,
  UserCircle,
  LogOut,
  Sparkles,
  FolderOpen,
  MessageSquareText,
  Menu,
  Route,
  Clapperboard,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

function initialsFrom(email: string | null) {
  if (!email) return "?";
  return email.slice(0, 2).toUpperCase();
}

// Definidos aqui dentro (não recebidos via prop) porque componentes de ícone
// (funções) não podem atravessar a fronteira Server -> Client Component.
// `principal`: aparece na barra inferior do celular; o resto fica em "Mais".
type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  principal?: boolean;
};

const NAV_CONFIG: Record<"admin" | "membro", { label: string; items: NavItem[] }> = {
  admin: {
    label: "Painel admin",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, principal: true },
      { href: "/admin/membros", label: "Membros", icon: Users, principal: true },
      { href: "/admin/agentes", label: "Agentes", icon: Bot, principal: true },
      { href: "/admin/conteudo", label: "Conteúdo", icon: Sparkles, principal: true },
      { href: "/admin/trilha", label: "Trilha", icon: Route },
      { href: "/admin/treinamentos", label: "ATL FLIX", icon: Clapperboard },
      { href: "/admin/scripts", label: "Scripts", icon: MessageSquareText },
      { href: "/admin/materiais", label: "Materiais", icon: FolderOpen },
      { href: "/admin/configuracoes", label: "Config.", icon: Settings },
    ],
  },
  membro: {
    label: "Área do membro",
    items: [
      { href: "/membro/dashboard", label: "Início", icon: LayoutDashboard, principal: true },
      { href: "/membro/kanban", label: "Kanban", icon: KanbanSquare, principal: true },
      { href: "/membro/scripts", label: "Scripts", icon: MessageSquareText, principal: true },
      { href: "/membro/agente-ia", label: "Agente IA", icon: Bot, principal: true },
      { href: "/membro/trilha", label: "Trilha", icon: Route },
      { href: "/membro/treinamentos", label: "ATL FLIX", icon: Clapperboard },
      { href: "/membro/conteudo", label: "Conteúdo", icon: Sparkles },
      { href: "/membro/materiais", label: "Materiais", icon: FolderOpen },
      { href: "/membro/perfil", label: "Perfil", icon: UserCircle },
    ],
  },
};

export function NavShell({
  role,
  userEmail,
  signOutAction,
  badges,
  children,
}: {
  role: "admin" | "membro";
  userEmail: string | null;
  signOutAction: () => Promise<void>;
  // Contadores por href (ex.: pendências em /admin/membros). 0 ou ausente = sem bolinha.
  badges?: Record<string, number>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);
  const { label, items } = NAV_CONFIG[role];
  const principais = items.filter((i) => i.principal);
  const extras = items.filter((i) => !i.principal);
  const extraAtivo = extras.some((i) => pathname.startsWith(i.href));
  const badgesExtras = extras.reduce((t, i) => t + (badges?.[i.href] ?? 0), 0);

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      {/* Sidebar — desktop */}
      <aside className="hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 text-sidebar-foreground md:flex md:w-60">
        <div className="mb-8 flex flex-col gap-1 px-2">
          <Logo size="md" />
          <span className="pl-0.5 text-[0.7rem] font-medium uppercase tracking-wide text-sidebar-foreground/50">
            {label}
          </span>
        </div>
        <span className="mb-2 px-3 text-[0.65rem] font-semibold tracking-[0.18em] text-sidebar-foreground/35 uppercase">
          Menu
        </span>
        <nav className="flex flex-1 flex-col gap-0.5">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
                {badges?.[item.href] ? (
                  <span className="ml-auto rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white tabular-nums">
                    {badges[item.href]}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col gap-3 border-t border-sidebar-border pt-4">
          <div className="flex items-center gap-2.5 px-1">
            <Avatar size="sm" className="ring-1 ring-amber-500/25">
              <AvatarFallback className="bg-amber-100 font-mono text-[0.65rem] font-semibold text-amber-900 dark:bg-gradient-to-br dark:from-amber-800/50 dark:to-amber-950/60 dark:text-amber-200">
                {initialsFrom(userEmail)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-xs text-sidebar-foreground/60">
              {userEmail}
            </span>
            <ThemeToggle />
          </div>
          <form action={signOutAction}>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              className="w-full justify-start text-sidebar-foreground/60"
            >
              <LogOut className="size-3.5" />
              Sair
            </Button>
          </form>
        </div>
      </aside>

      {/* Top bar — mobile */}
      <header className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <Logo size="sm" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <form action={signOutAction}>
            <Button variant="ghost" size="sm" type="submit">
              Sair
            </Button>
          </form>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8">{children}</main>

      {/* Tab bar — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-sidebar-border bg-sidebar text-sidebar-foreground md:hidden">
        {principais.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
                active ? "text-sidebar-primary" : "text-sidebar-foreground/60"
              )}
            >
              <span className="relative">
                <item.icon className="size-5" />
                {badges?.[item.href] ? (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-amber-500 px-1 text-center text-[10px] leading-4 font-semibold text-white tabular-nums">
                    {badges[item.href]}
                  </span>
                ) : null}
              </span>
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMaisAberto(true)}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
            extraAtivo ? "text-sidebar-primary" : "text-sidebar-foreground/60"
          )}
        >
          <span className="relative">
            <Menu className="size-5" />
            {badgesExtras ? (
              <span className="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-amber-500 px-1 text-center text-[10px] leading-4 font-semibold text-white tabular-nums">
                {badgesExtras}
              </span>
            ) : null}
          </span>
          Mais
        </button>
      </nav>

      <Sheet open={maisAberto} onOpenChange={setMaisAberto}>
        <SheetContent side="bottom" className="pb-6 md:hidden">
          <SheetHeader>
            <SheetTitle>Mais opções</SheetTitle>
          </SheetHeader>
          <nav className="grid grid-cols-3 gap-2 px-4">
            {extras.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMaisAberto(false)}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium",
                    active ? "border-primary bg-primary/10 text-primary" : "text-foreground/80"
                  )}
                >
                  <item.icon className="size-5" />
                  {item.label}
                  {badges?.[item.href] ? (
                    <span className="absolute top-1.5 right-1.5 min-w-4 rounded-full bg-amber-500 px-1 text-center text-[10px] leading-4 font-semibold text-white tabular-nums">
                      {badges[item.href]}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
