import Link from "next/link";
import { KanbanSquare, Bot, MessageCircle, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { LeadOriginChart } from "@/components/charts/lead-origin-chart";
import { LeadStageChart } from "@/components/charts/lead-stage-chart";
import { cn } from "@/lib/utils";

const MODO_LABEL: Record<string, string> = {
  recrutamento: "Recrutamento",
  energia: "Energia",
};

const WHATSAPP_LABEL: Record<string, string> = {
  desconectado: "Desconectado",
  aguardando_qr: "Aguardando QR",
  conectado: "Conectado",
  erro: "Erro",
};

const ACCENTS = {
  gold: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    bar: "bg-amber-500/70",
  },
  blue: {
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
    bar: "bg-sky-500/70",
  },
  emerald: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    bar: "bg-emerald-500/70",
  },
  slate: {
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
    bar: "bg-slate-400/60",
  },
  destructive: {
    badge: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    bar: "bg-red-500/70",
  },
} as const;

const WHATSAPP_ACCENT: Record<string, keyof typeof ACCENTS> = {
  desconectado: "slate",
  aguardando_qr: "gold",
  conectado: "emerald",
  erro: "destructive",
};

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent: keyof typeof ACCENTS;
}) {
  const { badge, bar } = ACCENTS[accent];
  return (
    <Card className="relative">
      <span className={cn("absolute inset-x-0 top-0 h-[3px] rounded-t-xl", bar)} />
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </span>
          <p className="font-mono text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", badge)}>
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

export default async function MembroDashboardPage() {
  const user = await requireMembro();
  const supabase = await createClient();

  // Cada membro tem um board por modo (recrutamento / energia); o dashboard
  // agrega os dois.
  const { data: boards } = await supabase
    .from("kanban_boards")
    .select("id")
    .eq("membro_id", user.id);
  const boardIds = (boards ?? []).map((b) => b.id);

  const [{ data: columns }, { data: cards }, { data: membro }, { data: whatsapp }] =
    await Promise.all([
      boardIds.length > 0
        ? supabase
            .from("kanban_columns")
            .select("id, nome")
            .in("board_id", boardIds)
            .order("posicao")
        : Promise.resolve({ data: [] }),
      boardIds.length > 0
        ? supabase.from("kanban_cards").select("coluna_id, origem").in("board_id", boardIds)
        : Promise.resolve({ data: [] }),
      supabase.from("membros").select("modo_agente_ativo").eq("usuario_id", user.id).single(),
      supabase.from("whatsapp_sessions").select("status").eq("membro_id", user.id).single(),
    ]);

  const totalLeads = cards?.length ?? 0;
  const manual = cards?.filter((c) => c.origem === "manual").length ?? 0;
  const agenteIa = cards?.filter((c) => c.origem === "agente_ia").length ?? 0;
  const stages = (columns ?? []).map((col) => ({
    nome: col.nome,
    total: cards?.filter((c) => c.coluna_id === col.id).length ?? 0,
  }));
  const whatsappStatus = whatsapp?.status ?? "desconectado";

  const quickActions = [
    {
      href: "/membro/kanban",
      icon: KanbanSquare,
      label: "Kanban de leads",
      description: "Acompanhe e organize seu funil",
    },
    {
      href: "/membro/agente-ia",
      icon: Bot,
      label: "Agente de IA",
      description: "Conecte o WhatsApp e escolha o modo",
    },
    {
      href: "/membro/perfil",
      icon: MessageCircle,
      label: "Perfil e links",
      description: "Atualize seus dados de contato",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Painel"
        title={`Olá, ${user.email?.split("@")[0]}`}
        description="Aqui está o resumo do seu dia."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={KanbanSquare} label="Leads no Kanban" value={totalLeads} accent="gold" />
        <StatCard
          icon={Bot}
          label="Modo do agente"
          value={MODO_LABEL[membro?.modo_agente_ativo ?? "recrutamento"]}
          accent="blue"
        />
        <StatCard
          icon={MessageCircle}
          label="WhatsApp"
          value={WHATSAPP_LABEL[whatsappStatus]}
          accent={WHATSAPP_ACCENT[whatsappStatus] ?? "slate"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Origem dos leads</CardTitle>
            <CardDescription>Como cada lead chegou até você</CardDescription>
          </CardHeader>
          <CardContent>
            <LeadOriginChart manual={manual} agenteIa={agenteIa} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads por etapa</CardTitle>
            <CardDescription>Distribuição atual do seu funil</CardDescription>
          </CardHeader>
          <CardContent>
            <LeadStageChart stages={stages} />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium text-foreground">Ações rápidas</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="group">
              <Card className="h-full transition-colors group-hover:border-amber-500/40">
                <CardContent className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <action.icon className="size-4" />
                    </span>
                    <p className="mt-1.5 text-sm font-medium text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/50 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber-600 dark:group-hover:text-amber-400" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
