import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { inicioDoDiaBrasilia } from "@/lib/acesso/robo";
import {
  ConfigMentorForm,
  DocumentoAcoes,
  DocumentoTextoDialog,
  EnviarPdf,
} from "./mentor-admin-ui";

// Processar PDF/texto (embeddings) roda nas server actions desta página.
export const maxDuration = 60;

const STATUS_LABEL: Record<string, string> = {
  pendente: "Não processado",
  pronto: "Pronto",
  erro: "Erro",
};

export default async function AdminMentorPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  await requireAdmin();
  const { filtro } = await searchParams;
  const supabase = await createClient();

  let perguntasQuery = supabase
    .from("mentor_perguntas")
    .select("id, pergunta, resposta, sem_base, created_at, membros(usuarios(nome_completo, email))")
    .order("created_at", { ascending: false })
    .limit(30);
  if (filtro === "sem-base") perguntasQuery = perguntasQuery.eq("sem_base", true);

  const [{ data: config }, { data: documentos }, { data: perguntas }, { count: hoje }] =
    await Promise.all([
      supabase.from("mentor_config").select("*").eq("id", 1).single(),
      supabase
        .from("mentor_documentos")
        .select("id, titulo, origem, nome_arquivo, conteudo, ativo, status, erro, total_trechos, updated_at")
        .order("created_at"),
      perguntasQuery,
      supabase
        .from("mentor_perguntas")
        .select("id", { count: "exact", head: true })
        .gte("created_at", inicioDoDiaBrasilia()),
    ]);

  const prontos = (documentos ?? []).filter((d) => d.ativo && d.status === "pronto");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Ativação"
        title="Mentor IA"
        description="O Mentor responde os membros só com base nos documentos abaixo. O que não estiver aqui, ele diz que não sabe."
      />

      {prontos.length === 0 && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          Nenhum documento ativo e processado: hoje o Mentor responde “não sei” para tudo. Revise o
          documento “Informações oficiais (rascunho)”, clique em Processar e depois em Ativar.
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Base de conhecimento</CardTitle>
          <div className="flex flex-wrap gap-2">
            <DocumentoTextoDialog />
            <EnviarPdf />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(documentos ?? []).length === 0 ? (
            <p className="border-t px-4 py-4 text-sm text-muted-foreground">
              Nenhum documento. Adicione textos ou PDFs oficiais.
            </p>
          ) : (
            <ul className="flex flex-col divide-y border-t">
              {(documentos ?? []).map((d) => (
                <li key={d.id} className={`flex flex-col gap-2 px-4 py-3 ${d.ativo ? "" : "opacity-70"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{d.titulo}</span>
                    <Badge variant="outline">{d.origem === "pdf" ? "PDF" : "Texto"}</Badge>
                    <Badge
                      variant={
                        d.status === "pronto" ? "default" : d.status === "erro" ? "destructive" : "secondary"
                      }
                    >
                      {STATUS_LABEL[d.status] ?? d.status}
                    </Badge>
                    {!d.ativo && <Badge variant="outline">Desativado</Badge>}
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {d.conteudo.length.toLocaleString("pt-BR")} caracteres
                      {d.status === "pronto" ? ` · ${d.total_trechos} trechos` : ""}
                    </span>
                  </div>
                  {d.erro && d.status === "erro" && (
                    <p className="text-xs text-destructive">{d.erro}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DocumentoTextoDialog
                      documento={{ id: d.id, titulo: d.titulo, conteudo: d.conteudo }}
                    />
                    <DocumentoAcoes id={d.id} titulo={d.titulo} ativo={d.ativo} status={d.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Perguntas recentes</CardTitle>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground tabular-nums">{hoje ?? 0} hoje</span>
            <a
              href={filtro === "sem-base" ? "/admin/mentor" : "/admin/mentor?filtro=sem-base"}
              className="text-primary underline underline-offset-2"
            >
              {filtro === "sem-base" ? "Ver todas" : "Só as sem resposta"}
            </a>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(perguntas ?? []).length === 0 ? (
            <p className="border-t px-4 py-4 text-sm text-muted-foreground">Nenhuma pergunta ainda.</p>
          ) : (
            <ul className="flex flex-col divide-y border-t">
              {(perguntas ?? []).map((p) => (
                <li key={p.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {p.membros?.usuarios?.nome_completo || p.membros?.usuarios?.email || "Membro"}
                    </span>
                    <span>· {new Date(p.created_at).toLocaleString("pt-BR")}</span>
                    {p.sem_base && <Badge variant="secondary">Sem base</Badge>}
                  </div>
                  <p className="font-medium">{p.pergunta}</p>
                  <details>
                    <summary className="cursor-pointer text-xs text-muted-foreground">Resposta</summary>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{p.resposta}</p>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração</CardTitle>
        </CardHeader>
        <CardContent>
          <ConfigMentorForm
            ativo={config?.ativo ?? true}
            limiteDiario={config?.limite_diario ?? 20}
            promptSistema={config?.prompt_sistema ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
