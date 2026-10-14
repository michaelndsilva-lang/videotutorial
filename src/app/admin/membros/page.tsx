import Link from "next/link";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  MEMBRO_STATUS_LABEL,
  MEMBRO_STATUS_VARIANT,
  MODOS_ROBO_LABEL,
  ROBO_STATUS_LABEL,
  ROBO_STATUS_VARIANT,
} from "@/lib/acesso/labels";
import { cn } from "@/lib/utils";
import { MembroActions, RoboActions } from "./membro-actions";
import { PendentesLista } from "./aprovar-lote";
import type { WhatsappStatus } from "@/lib/types/database.types";

const WHATSAPP_LABEL: Record<WhatsappStatus, string> = {
  desconectado: "Desconectado",
  aguardando_qr: "Aguardando QR",
  conectado: "Conectado",
  erro: "Erro",
};

const ABAS = [
  { id: "pendentes", label: "Pendentes" },
  { id: "aprovados", label: "Aprovados" },
  { id: "robo", label: "Solicitações de robô" },
  { id: "suspensos", label: "Suspensos" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

export default async function AdminMembrosPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  await requireAdmin();
  const { aba: abaParam } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("membros")
    .select(
      "usuario_id, status, created_at, motivo_status, usuarios(nome_completo, email), whatsapp_sessions(status), robo_acesso(status, modos_permitidos, limite_diario_mensagens, solicitado_em)"
    )
    .order("created_at", { ascending: false });

  const membros = (data ?? []).map((m) => ({
    usuarioId: m.usuario_id,
    status: m.status,
    createdAt: m.created_at,
    motivoStatus: m.motivo_status,
    nome: m.usuarios?.nome_completo || m.usuarios?.email || "—",
    email: m.usuarios?.email ?? null,
    whatsapp: m.whatsapp_sessions?.status ?? null,
    robo: m.robo_acesso,
  }));

  const grupos: Record<Aba, typeof membros> = {
    pendentes: membros.filter((m) => m.status === "pendente"),
    aprovados: membros.filter((m) => m.status === "ativo"),
    robo: membros
      .filter((m) => m.status === "ativo" && m.robo?.status === "solicitado")
      .sort((a, b) => (a.robo?.solicitado_em ?? "").localeCompare(b.robo?.solicitado_em ?? "")),
    suspensos: membros.filter(
      (m) => m.status === "suspenso" || m.status === "recusado" || m.status === "inativo"
    ),
  };

  // Sem aba na URL: abre onde há algo para decidir.
  const aba: Aba = ABAS.some((a) => a.id === abaParam)
    ? (abaParam as Aba)
    : grupos.pendentes.length > 0
      ? "pendentes"
      : grupos.robo.length > 0
        ? "robo"
        : "aprovados";
  const lista = grupos[aba];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Controle de acesso"
        title="Membros"
        description="Aprove cadastros e libere o robô de WhatsApp um a um."
        actions={
          <Link href="/admin/logs" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <History className="size-4" />
            Histórico
          </Link>
        }
      />

      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {ABAS.map((a) => {
          const total = grupos[a.id].length;
          const destacar = (a.id === "pendentes" || a.id === "robo") && total > 0;
          return (
            <Link
              key={a.id}
              href={`/admin/membros?aba=${a.id}`}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                aba === a.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {a.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  aba === a.id
                    ? "bg-primary-foreground/20"
                    : destacar
                      ? "bg-amber-500 text-white"
                      : "bg-muted"
                )}
              >
                {total}
              </span>
            </Link>
          );
        })}
      </nav>

      {lista.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nada por aqui</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {aba === "pendentes"
              ? "Nenhum cadastro aguardando aprovação. Novos cadastros em /cadastro aparecem aqui."
              : aba === "robo"
                ? "Nenhum pedido de robô aguardando liberação."
                : aba === "suspensos"
                  ? "Nenhum membro suspenso ou recusado."
                  : "Nenhum membro aprovado ainda."}
          </CardContent>
        </Card>
      ) : aba === "pendentes" ? (
        <PendentesLista
          membros={lista.map((m) => ({
            usuarioId: m.usuarioId,
            nome: m.nome,
            email: m.email,
            cadastradoEm: m.createdAt,
          }))}
        />
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {lista.map((m) => (
            <li key={m.usuarioId} className="flex flex-col gap-3 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-col">
                  <Link
                    href={`/admin/membros/${m.usuarioId}`}
                    className="truncate font-medium underline-offset-4 hover:underline"
                  >
                    {m.nome}
                  </Link>
                  <span className="truncate text-sm text-muted-foreground">{m.email}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant={MEMBRO_STATUS_VARIANT[m.status]}>
                    {MEMBRO_STATUS_LABEL[m.status]}
                  </Badge>
                  {m.robo && aba !== "suspensos" && (
                    <Badge variant={ROBO_STATUS_VARIANT[m.robo.status]}>
                      Robô: {ROBO_STATUS_LABEL[m.robo.status]}
                    </Badge>
                  )}
                  {m.whatsapp && aba === "aprovados" && (
                    <span className="text-muted-foreground">
                      WhatsApp: {WHATSAPP_LABEL[m.whatsapp]}
                    </span>
                  )}
                </div>
              </div>

              {m.robo?.status === "liberado" && aba === "aprovados" && (
                <p className="text-xs text-muted-foreground">
                  {m.robo.modos_permitidos.map((x) => MODOS_ROBO_LABEL[x] ?? x).join(" + ")} ·
                  até {m.robo.limite_diario_mensagens} respostas/dia
                </p>
              )}
              {aba === "robo" && m.robo?.solicitado_em && (
                <p className="text-xs text-muted-foreground">
                  Pediu em {new Date(m.robo.solicitado_em).toLocaleString("pt-BR")} e aceitou o
                  termo de risco.
                </p>
              )}
              {aba === "suspensos" && m.motivoStatus && (
                <p className="text-xs text-muted-foreground">Motivo: {m.motivoStatus}</p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {m.robo && aba !== "suspensos" && (
                  <RoboActions
                    usuarioId={m.usuarioId}
                    nome={m.nome}
                    membroStatus={m.status}
                    roboStatus={m.robo.status}
                    modosPermitidos={m.robo.modos_permitidos}
                    limite={m.robo.limite_diario_mensagens}
                  />
                )}
                {aba !== "robo" && (
                  <MembroActions usuarioId={m.usuarioId} status={m.status} nome={m.nome} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
