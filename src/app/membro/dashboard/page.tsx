import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  CalendarClock,
  Clapperboard,
  FolderOpen,
  Globe,
  GraduationCap,
  KanbanSquare,
  LifeBuoy,
  Megaphone,
  MessageSquareText,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { LeadOriginChart } from "@/components/charts/lead-origin-chart";
import { LeadStageChart } from "@/components/charts/lead-stage-chart";
import { AgendaLista, AvisosLista } from "@/components/mural";
import { carregarAvisos, carregarEventos } from "@/lib/mural/carregar";
import { perguntasRestantesHoje } from "@/lib/mentor/responder";
import { ORIGENS, hojeBrasilia } from "@/lib/kanban/origem";
import { cn } from "@/lib/utils";
import type { CardOrigem } from "@/lib/types/database.types";

function Numero({
  icon: Icon,
  label,
  valor,
  href,
  destaque = false,
}: {
  icon: LucideIcon;
  label: string;
  valor: string | number;
  href: string;
  destaque?: boolean;
}) {
  return (
    <Link href={href} className="group">
      <Card className={cn("h-full transition-colors group-hover:border-amber-500/40", destaque && "border-amber-500/50")}>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
            <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums">{valor}</span>
          </div>
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              destaque
                ? "bg-amber-500 text-white"
                : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
            )}
          >
            <Icon className="size-5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

type Recurso = {
  href: string;
  icon: LucideIcon;
  titulo: string;
  descricao: string;
  status?: string;
};

function RecursoCard({ r }: { r: Recurso }) {
  return (
    <Link href={r.href} className="group">
      <Card className="h-full transition-colors group-hover:border-amber-500/40">
        <CardContent className="flex h-full flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <r.icon className="size-4" />
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/50 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber-600 dark:group-hover:text-amber-400" />
          </div>
          <p className="text-sm font-medium">{r.titulo}</p>
          <p className="text-xs text-muted-foreground">{r.descricao}</p>
          {r.status && (
            <p className="mt-auto pt-1 text-xs font-medium text-amber-700 dark:text-amber-400">{r.status}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

const ROBO_STATUS: Record<string, string> = {
  sem_acesso: "Peça a liberação",
  solicitado: "Aguardando liberação",
  revogado: "Bloqueado",
};

export default async function MembroDashboardPage() {
  const user = await requireMembro();
  const supabase = await createClient();

  // Cada membro tem um board por modo (recrutamento / energia); o painel
  // agrega todos.
  const { data: boards } = await supabase.from("kanban_boards").select("id").eq("membro_id", user.id);
  const boardIds = (boards ?? []).map((b) => b.id);

  const [
    { data: columns },
    { data: cards },
    { data: usuario },
    { data: perfil },
    { data: pagina },
    { count: contatosPagina },
    { data: equipe },
    { data: aulas },
    { count: aulasFeitas },
    { count: materiais },
    { data: robo },
    { data: sessao },
    mentor,
    avisosFixados,
    proximosEventos,
  ] = await Promise.all([
    boardIds.length
      ? supabase.from("kanban_columns").select("id, nome").in("board_id", boardIds).order("posicao")
      : Promise.resolve({ data: [] }),
    boardIds.length
      ? supabase.from("kanban_cards").select("coluna_id, origem, proximo_followup").in("board_id", boardIds)
      : Promise.resolve({ data: [] }),
    supabase.from("usuarios").select("nome_completo").eq("id", user.id).single(),
    supabase.from("perfil_conteudo").select("nome_exibicao").eq("usuario_id", user.id).maybeSingle(),
    supabase.from("paginas").select("publicada, visitas").eq("membro_id", user.id).maybeSingle(),
    supabase.from("lead_consentimentos").select("id", { count: "exact", head: true }).eq("membro_id", user.id),
    supabase.rpc("radar_equipe"),
    supabase.from("aulas").select("id"),
    supabase.from("aula_progresso").select("aula_id", { count: "exact", head: true }).eq("membro_id", user.id),
    supabase.from("materiais").select("id", { count: "exact", head: true }),
    supabase.from("robo_acesso").select("status").eq("membro_id", user.id).maybeSingle(),
    supabase.from("whatsapp_sessions").select("status").eq("membro_id", user.id).maybeSingle(),
    perguntasRestantesHoje(user.id),
    carregarAvisos(true),
    carregarEventos(user.id, 1),
  ]);

  const nome = (perfil?.nome_exibicao || usuario?.nome_completo || user.email?.split("@")[0] || "").split(/\s+/)[0];
  const hoje = hojeBrasilia();
  const totalLeads = cards?.length ?? 0;
  const followupsHoje = (cards ?? []).filter((c) => c.proximo_followup && c.proximo_followup <= hoje).length;
  const naEquipe = equipe?.length ?? 0;
  const contagensOrigem = Object.fromEntries(
    ORIGENS.map((o) => [o, cards?.filter((c) => c.origem === o).length ?? 0])
  ) as Record<CardOrigem, number>;
  const stages = (columns ?? []).map((col) => ({
    nome: col.nome,
    total: cards?.filter((c) => c.coluna_id === col.id).length ?? 0,
  }));

  const statusRobo =
    robo?.status === "liberado"
      ? sessao?.status === "conectado"
        ? "Conectado e respondendo"
        : "Liberado: conecte seu WhatsApp"
      : ROBO_STATUS[robo?.status ?? "sem_acesso"];

  const recursos: Recurso[] = [
    {
      href: "/membro/kanban",
      icon: KanbanSquare,
      titulo: "Kanban de leads",
      descricao: "Organize seus contatos por etapa e não perca nenhum follow-up.",
      status: followupsHoje > 0 ? `${followupsHoje} follow-up(s) para hoje` : `${totalLeads} lead(s)`,
    },
    {
      href: "/membro/conteudo",
      icon: Sparkles,
      titulo: "Conteúdo com IA",
      descricao: "Roteiros de Reels, legendas, stories e mensagens de prospecção prontos.",
    },
    {
      href: "/membro/minha-pagina",
      icon: Globe,
      titulo: "Minha página",
      descricao: "Sua página para a bio do Instagram: quem deixa o contato cai no Kanban.",
      status: pagina?.publicada ? `${pagina.visitas} visita(s) · ${contatosPagina ?? 0} contato(s)` : "Ainda não publicada",
    },
    {
      href: "/membro/treinamentos",
      icon: Clapperboard,
      titulo: "ATL FLIX",
      descricao: "Treinamentos em vídeo da equipe, no seu ritmo.",
      status: (aulas ?? []).length ? `${aulasFeitas ?? 0} de ${(aulas ?? []).length} aulas assistidas` : undefined,
    },
    {
      href: "/membro/mentor",
      icon: GraduationCap,
      titulo: "Mentor IA",
      descricao: "Tire dúvidas sobre produtos, adesão e energia a qualquer hora.",
      status: mentor.ativo ? `${mentor.restantes} pergunta(s) disponíveis hoje` : undefined,
    },
    {
      href: "/membro/materiais",
      icon: FolderOpen,
      titulo: "Materiais",
      descricao: "Catálogos, apresentações e vídeos oficiais para enviar aos contatos.",
      status: materiais ? `${materiais} material(is)` : undefined,
    },
    {
      href: "/membro/mural",
      icon: Megaphone,
      titulo: "Mural e agenda",
      descricao: "Avisos da liderança, lives e as conquistas da equipe.",
      status: proximosEventos[0] ? "Tem evento marcado" : undefined,
    },
    {
      href: "/membro/equipe",
      icon: UsersRound,
      titulo: "Minha equipe",
      descricao: "Seu link de convite e o radar de quem está ativo na sua linha.",
      status: naEquipe ? `${naEquipe} pessoa(s) na sua linha` : "Convide sua primeira pessoa",
    },
    {
      href: "/membro/agente-ia",
      icon: Bot,
      titulo: "Robô de WhatsApp",
      descricao: "Atendimento automático para quem chama você no WhatsApp.",
      status: statusRobo,
    },
    {
      href: "/membro/ajuda",
      icon: LifeBuoy,
      titulo: "Preciso de ajuda",
      descricao: "Travou? Seu líder e o administrador recebem na hora.",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Início"
        title={nome ? `Olá, ${nome}!` : "Olá!"}
        description="Tudo o que você precisa para prospectar, vender e crescer sua equipe, em um só lugar."
      />

      {avisosFixados.length > 0 && <AvisosLista avisos={avisosFixados} />}
      {proximosEventos.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Próximo evento</h2>
            <Link href="/membro/mural" className="text-xs text-muted-foreground underline underline-offset-2">
              Ver agenda
            </Link>
          </div>
          <AgendaLista eventos={proximosEventos} />
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero icon={KanbanSquare} label="Leads" valor={totalLeads} href="/membro/kanban" />
        <Numero
          icon={CalendarClock}
          label="Follow-ups hoje"
          valor={followupsHoje}
          href="/membro/kanban"
          destaque={followupsHoje > 0}
        />
        <Numero icon={MessageSquareText} label="Contatos da página" valor={contatosPagina ?? 0} href="/membro/minha-pagina" />
        <Numero icon={UsersRound} label="Na sua equipe" valor={naEquipe} href="/membro/equipe" />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Sua plataforma</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recursos.map((r) => (
            <RecursoCard key={r.href} r={r} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Seu funil</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Origem dos leads</CardTitle>
              <CardDescription>Como cada lead chegou até você</CardDescription>
            </CardHeader>
            <CardContent>
              <LeadOriginChart contagens={contagensOrigem} />
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
      </section>
    </div>
  );
}
