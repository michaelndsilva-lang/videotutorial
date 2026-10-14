import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { AulaDialog, CursoDialog, ItemAcoes } from "./treinamentos-admin-ui";

export default async function AdminTreinamentosPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: cursos }, { data: aulas }, { data: progresso }, { count: aprovados }] =
    await Promise.all([
      supabase.from("cursos").select("*").order("categoria").order("ordem").order("created_at"),
      supabase.from("aulas").select("*").order("ordem").order("created_at"),
      supabase.from("aula_progresso").select("membro_id, aula_id"),
      supabase.from("membros").select("*", { count: "exact", head: true }).eq("status", "ativo"),
    ]);

  const listaCursos = cursos ?? [];
  const categorias = Array.from(new Set(listaCursos.map((c) => c.categoria)));

  // Quantos membros assistiram cada aula e quantos concluíram cada curso
  // (todas as aulas ativas).
  const membrosPorAula = new Map<string, Set<string>>();
  for (const p of progresso ?? []) {
    membrosPorAula.set(p.aula_id, (membrosPorAula.get(p.aula_id) ?? new Set()).add(p.membro_id));
  }
  function concluiramCurso(cursoId: string) {
    const ativas = (aulas ?? []).filter((a) => a.curso_id === cursoId && a.ativo);
    if (ativas.length === 0) return 0;
    const [primeira, ...resto] = ativas.map((a) => membrosPorAula.get(a.id) ?? new Set<string>());
    return [...primeira].filter((m) => resto.every((s) => s.has(m))).length;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="ATL FLIX"
        title="Treinamentos"
        description="Cursos em vídeo (YouTube não listado). Só cursos publicados, com aulas visíveis, aparecem para os membros."
        actions={<CursoDialog categorias={categorias} />}
      />

      {listaCursos.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nenhum curso ainda</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Crie um curso e adicione as aulas com os links do YouTube.
          </CardContent>
        </Card>
      ) : (
        categorias.map((categoria) => {
          const daCategoria = listaCursos.filter((c) => c.categoria === categoria);
          return (
            <section key={categoria} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                {categoria}
              </h2>
              {daCategoria.map((c, ci) => {
                const doCurso = (aulas ?? []).filter((a) => a.curso_id === c.id);
                return (
                  <Card key={c.id} className={c.ativo ? "" : "opacity-80"}>
                    <CardHeader className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{c.titulo}</CardTitle>
                        {c.ativo ? (
                          <Badge>Publicado</Badge>
                        ) : (
                          <Badge variant="outline">Rascunho</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {concluiramCurso(c.id)} de {aprovados ?? 0} membro(s) concluíram
                        </span>
                      </div>
                      {c.descricao && (
                        <p className="text-sm text-muted-foreground">{c.descricao}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CursoDialog
                          categorias={categorias}
                          curso={{
                            id: c.id,
                            categoria: c.categoria,
                            titulo: c.titulo,
                            descricao: c.descricao,
                            ativo: c.ativo,
                          }}
                        />
                        <AulaDialog cursoId={c.id} />
                        <ItemAcoes
                          tipo="curso"
                          id={c.id}
                          titulo={c.titulo}
                          ativo={c.ativo}
                          primeiro={ci === 0}
                          ultimo={ci === daCategoria.length - 1}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {doCurso.length === 0 ? (
                        <p className="border-t px-4 py-3 text-sm text-muted-foreground">
                          Nenhuma aula. O curso só aparece para os membros quando tiver aulas.
                        </p>
                      ) : (
                        <ol className="flex flex-col divide-y border-t">
                          {doCurso.map((a, i) => (
                            <li
                              key={a.id}
                              className={`flex flex-col gap-2 px-4 py-3 ${a.ativo ? "" : "opacity-60"}`}
                            >
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-medium">
                                  {i + 1}. {a.titulo}
                                </span>
                                {!a.ativo && <Badge variant="outline">Escondida</Badge>}
                                <span className="text-xs text-muted-foreground">
                                  {membrosPorAula.get(a.id)?.size ?? 0} assistiram
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <AulaDialog
                                  cursoId={c.id}
                                  aula={{
                                    id: a.id,
                                    titulo: a.titulo,
                                    descricao: a.descricao,
                                    videoUrl: a.video_url,
                                    ativo: a.ativo,
                                  }}
                                />
                                <ItemAcoes
                                  tipo="aula"
                                  id={a.id}
                                  titulo={a.titulo}
                                  ativo={a.ativo}
                                  primeiro={i === 0}
                                  ultimo={i === doCurso.length - 1}
                                />
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          );
        })
      )}
    </div>
  );
}
