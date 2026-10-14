import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { TIPO_TAREFA_LABEL, TOTAL_DIAS, montarTrilha } from "@/lib/trilha/progresso";
import { AtivarTodasMissoes, MissaoAcoes, MissaoDialog } from "./trilha-admin-ui";
import type { TipoTarefa } from "@/lib/types/database.types";

export default async function AdminTrilhaPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: missoes }, { data: progresso }, { data: membros }] = await Promise.all([
    supabase.from("missoes").select("*").order("dia").order("ordem").order("created_at"),
    supabase.from("missao_progresso").select("membro_id, missao_id, resposta, concluido_em"),
    supabase
      .from("membros")
      .select("usuario_id, usuarios(nome_completo, email)")
      .eq("status", "ativo"),
  ]);

  const todas = missoes ?? [];
  const ativas = todas.filter((m) => m.ativo);
  const inativas = todas.length - ativas.length;
  const tituloPorMissao = new Map(todas.map((m) => [m.id, m.titulo]));

  const progressoMembros = (membros ?? [])
    .map((m) => {
      const meus = (progresso ?? []).filter((p) => p.membro_id === m.usuario_id);
      const trilha = montarTrilha(ativas, new Set(meus.map((p) => p.missao_id)));
      const ultima = meus.map((p) => p.concluido_em).sort().at(-1) ?? null;
      const respostas = meus
        .filter((p) => p.resposta)
        .map((p) => ({ titulo: tituloPorMissao.get(p.missao_id) ?? "Missão", resposta: p.resposta }));
      return {
        id: m.usuario_id,
        nome: m.usuarios?.nome_completo || m.usuarios?.email || "—",
        trilha,
        ultima,
        respostas,
      };
    })
    .sort((a, b) => b.trilha.percentual - a.trilha.percentual || a.nome.localeCompare(b.nome));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Ativação"
        title="Trilha: primeiros 7 dias"
        description="Missões diárias para o novo consultor. Cada dia libera quando o anterior está 100% concluído."
        actions={<MissaoDialog />}
      />

      {inativas > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            {inativas} missão(ões) desativadas (rascunho). Os membros só veem as ativas. Revise e
            ative quando estiver pronto.
          </span>
          <AtivarTodasMissoes total={inativas} />
        </div>
      )}

      {ativas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso dos membros</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="flex flex-col divide-y">
              {progressoMembros.map((m) => (
                <li key={m.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{m.nome}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {m.trilha.concluida ? "Concluiu 🏆" : `Dia ${m.trilha.diaAtual}`} ·{" "}
                      {m.trilha.feitas}/{m.trilha.total} ·{" "}
                      {m.ultima
                        ? `última em ${new Date(m.ultima).toLocaleDateString("pt-BR")}`
                        : "não começou"}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${m.trilha.percentual}%` }}
                    />
                  </div>
                  {m.respostas.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground">
                        Ver respostas ({m.respostas.length})
                      </summary>
                      <ul className="mt-2 flex flex-col gap-2">
                        {m.respostas.map((r, i) => (
                          <li key={i} className="rounded-lg bg-muted/50 p-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              {r.titulo}
                            </span>
                            <p className="whitespace-pre-wrap">{r.resposta}</p>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {Array.from({ length: TOTAL_DIAS }, (_, i) => i + 1).map((dia) => {
        const doDia = todas.filter((m) => m.dia === dia);
        return (
          <section key={dia} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Dia {dia}
              </h2>
              <MissaoDialog diaPadrao={dia} />
            </div>
            {doDia.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Nenhuma missão neste dia.
              </p>
            ) : (
              <ul className="flex flex-col divide-y rounded-xl border">
                {doDia.map((m, i) => (
                  <li key={m.id} className={`flex flex-col gap-2 p-4 ${m.ativo ? "" : "opacity-70"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{m.titulo}</span>
                      <Badge variant="outline">{TIPO_TAREFA_LABEL[m.tipo_tarefa as TipoTarefa]}</Badge>
                      {m.video_url && <Badge variant="secondary">Vídeo</Badge>}
                      {!m.ativo && <Badge variant="outline">Rascunho</Badge>}
                    </div>
                    {m.descricao && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{m.descricao}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <MissaoDialog
                        missao={{
                          id: m.id,
                          dia: m.dia,
                          titulo: m.titulo,
                          descricao: m.descricao,
                          videoUrl: m.video_url,
                          tipo: m.tipo_tarefa as TipoTarefa,
                          ativo: m.ativo,
                        }}
                      />
                      <MissaoAcoes
                        id={m.id}
                        titulo={m.titulo}
                        ativo={m.ativo}
                        primeiro={i === 0}
                        ultimo={i === doDia.length - 1}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
