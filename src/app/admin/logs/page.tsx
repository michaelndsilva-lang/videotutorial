import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { ACAO_LABEL, type AcaoAcesso } from "@/lib/acesso/log";

const LIMITE = 200;

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ acao?: string; membro?: string }>;
}) {
  await requireAdmin();
  const { acao, membro } = await searchParams;
  const supabase = await createClient();

  // access_logs tem duas FKs para usuarios (ator e membro): o embed precisa
  // da dica com o nome da constraint.
  let query = supabase
    .from("access_logs")
    .select(
      "id, acao, motivo, detalhes, created_at, ator:usuarios!access_logs_ator_id_fkey(nome_completo, email), membro:usuarios!access_logs_membro_id_fkey(nome_completo, email)"
    )
    .order("created_at", { ascending: false })
    .limit(LIMITE);
  if (acao && acao in ACAO_LABEL) query = query.eq("acao", acao);
  if (membro) query = query.eq("membro_id", membro);

  const [{ data: logs, error }, { data: usuarios }] = await Promise.all([
    query,
    supabase
      .from("usuarios")
      .select("id, nome_completo, email")
      .eq("role", "membro")
      .order("nome_completo"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/membros"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Membros
      </Link>
      <PageHeader
        eyebrow="Controle de acesso"
        title="Histórico"
        description="Cadastros, aprovações, suspensões, liberações do robô e mudanças nos materiais."
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Ação</span>
          <select name="acao" defaultValue={acao ?? ""} className={selectClass}>
            <option value="">Todas</option>
            {(Object.keys(ACAO_LABEL) as AcaoAcesso[]).map((a) => (
              <option key={a} value={a}>
                {ACAO_LABEL[a]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Membro</span>
          <select name="membro" defaultValue={membro ?? ""} className={selectClass}>
            <option value="">Todos</option>
            {(usuarios ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome_completo || u.email}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonVariants({ size: "sm" })}>
          Filtrar
        </button>
        {(acao || membro) && (
          <Link href="/admin/logs" className={buttonVariants({ size: "sm", variant: "ghost" })}>
            Limpar
          </Link>
        )}
      </form>

      {error ? (
        <p className="text-sm text-destructive">Não foi possível carregar o histórico.</p>
      ) : !logs || logs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nenhum registro</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            As ações de acesso passam a ser registradas a partir da Fase 0.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border text-sm">
          {logs.map((log) => {
            const detalhes = (log.detalhes ?? {}) as {
              nome?: string | null;
              email?: string | null;
              titulo?: string | null;
            };
            const alvo =
              log.membro?.nome_completo ||
              log.membro?.email ||
              detalhes.nome ||
              detalhes.email ||
              (detalhes.titulo ? `“${detalhes.titulo}”` : null) ||
              "—";
            const ator = log.ator?.nome_completo || log.ator?.email || "Sistema";
            return (
              <li key={log.id} className="flex flex-col gap-0.5 p-4">
                <span className="font-medium">
                  {ACAO_LABEL[log.acao as AcaoAcesso] ?? log.acao}
                  <span className="font-normal text-muted-foreground"> · {alvo}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString("pt-BR")} · por {ator}
                </span>
                {log.motivo && <span className="text-xs">Motivo: {log.motivo}</span>}
              </li>
            );
          })}
        </ul>
      )}
      {logs && logs.length === LIMITE && (
        <p className="text-xs text-muted-foreground">
          Mostrando os {LIMITE} registros mais recentes. Use os filtros para refinar.
        </p>
      )}
    </div>
  );
}
