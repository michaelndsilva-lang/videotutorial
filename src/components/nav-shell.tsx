"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Bot, Settings, KanbanSquare, UserCircle, LogOut, Sparkles } from "lucide-react";
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
const NAV_CONFIG = {
  admin: {
    label: "Painel admin",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/membros", label: "Membros", icon: Users },
      { href: "/admin/agentes", label: "Agentes", icon: Bot },
      { href: "/admin/conteudo", label: "Conteúdo", icon: Sparkles },
      { href: "/admin/configuracoes", label: "Config.", icon: Settings },
    ],
  },
  membro: {
    label: "Área do membro",
    items: [
      { href: "/membro/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/membro/kanban", label: "Kanban", icon: KanbanSquare },
      { href: "/membro/agente-ia", label: "Agente IA", icon: Bot },
      { href: "/membro/conteudo", label: "Conteúdo", icon: Sparkles },
      { href: "/membro/perfil", label: "Perfil", icon: UserCircle },
    ],
  },
} as const;

export function NavShell({
  role,
  userEmail,
  signOutAction,
  children,
}: {
  role: "admin" | "membro";
  userEmail: string | null;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { label, items } = NAV_CONFIG[role];

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
        {items.map((item) => {
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
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
