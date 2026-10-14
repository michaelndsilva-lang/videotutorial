import Link from "next/link";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { extrairYoutubeId } from "@/lib/youtube";

export default async function MembroTreinamentosPage() {
  const user = await requireMembro();
  const supabase = await createClient();

  // RLS: só cursos e aulas ativos, e só o progresso do próprio membro.
  const [{ data: cursos }, { data: aulas }, { data: progresso }] = await Promise.all([
    supabase.from("cursos").select("id, categoria, titulo, descricao").order("categoria").order("ordem"),
    supabase.from("aulas").select("id, curso_id, video_url").order("ordem"),
    supabase.from("aula_progresso").select("aula_id").eq("membro_id", user.id),
  ]);

  const feitas = new Set((progresso ?? []).map((p) => p.aula_id));
  const lista = (cursos ?? [])
    .map((c) => {
      const doCurso = (aulas ?? []).filter((a) => a.curso_id === c.id);
      const concluidas = doCurso.filter((a) => feitas.has(a.id)).length;
      return {
        ...c,
        total: doCurso.length,
        concluidas,
        capa: extrairYoutubeId(doCurso[0]?.video_url),
      };
    })
    .filter((c) => c.total > 0);

  const porCategoria = new Map<string, typeof lista>();
  for (const c of lista) porCategoria.set(c.categoria, [...(porCategoria.get(c.categoria) ?? []), c]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="ATL FLIX"
        title="Treinamentos"
        description="Cursos em vídeo da equipe. A aula é marcada como assistida quando o vídeo termina."
      />

      {lista.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nenhum treinamento por enquanto</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Assim que o administrador publicar cursos, eles aparecem aqui.
          </CardContent>
        </Card>
      ) : (
        Array.from(porCategoria.entries()).map(([categoria, itens]) => (
          <section key={categoria} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {categoria}
            </h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {itens.map((c) => {
                const pct = Math.round((c.concluidas / c.total) * 100);
                const completo = c.concluidas === c.total;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/membro/treinamentos/${c.id}`}
                      className="group flex h-full flex-col overflow-hidden rounded-xl border transition-colors hover:border-primary/60"
                    >
                      <div className="relative aspect-video bg-muted">
                        {c.capa && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`https://img.youtube.com/vi/${c.capa}/hqdefault.jpg`}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        )}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
                          <PlayCircle className="size-12 text-white" />
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <span className="flex items-start justify-between gap-2 font-medium">
                          {c.titulo}
                          {completo && (
                            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </span>
                        {c.descricao && (
                          <span className="line-clamp-2 text-sm text-muted-foreground">
                            {c.descricao}
                          </span>
                        )}
                        <div className="mt-auto flex flex-col gap-1 pt-2">
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {c.concluidas}/{c.total} aulas
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
