import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  CategoriaAcoes,
  NovaCategoria,
  ScriptAcoes,
  ScriptDialog,
} from "./scripts-admin-ui";

export default async function AdminScriptsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 30);
  const desde = inicio.toISOString();

  const [{ data: categorias }, { data: scripts }, { data: usos }] = await Promise.all([
    supabase.from("script_categorias").select("id, nome, ativo, ordem").order("ordem").order("nome"),
    supabase.from("scripts").select("id, categoria_id, titulo, texto, ativo, ordem").order("ordem").order("titulo"),
    supabase.from("script_usos").select("script_id, membro_id").gte("created_at", desde),
  ]);

  const usoPorScript = new Map<string, { total: number; membros: Set<string> }>();
  for (const u of usos ?? []) {
    const atual = usoPorScript.get(u.script_id) ?? { total: 0, membros: new Set<string>() };
    atual.total++;
    atual.membros.add(u.membro_id);
    usoPorScript.set(u.script_id, atual);
  }
  const maisUsados = (scripts ?? [])
    .map((s) => ({ ...s, uso: usoPorScript.get(s.id) }))
    .filter((s) => s.uso)
    .sort((a, b) => (b.uso?.total ?? 0) - (a.uso?.total ?? 0))
    .slice(0, 5);

  const listaCategorias = (categorias ?? []).map((c) => ({ id: c.id, nome: c.nome }));
  const totalInativos = (scripts ?? []).filter((s) => !s.ativo).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Prospecção"
        title="Scripts"
        description="Mensagens prontas que os membros copiam ou abrem direto no WhatsApp. Só scripts ativos, em categorias visíveis, aparecem para eles."
        actions={<ScriptDialog categorias={listaCategorias} />}
      />

      {totalInativos > 0 && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {totalInativos} script(s) ainda estão desativados (rascunho). Revise o texto e use
          “Ativar” ou “Ativar todos” em cada categoria para liberar aos membros.
        </p>
      )}

      {maisUsados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mais usados (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-1 text-sm">
              {maisUsados.map((s, i) => (
                <li key={s.id} className="flex justify-between gap-2">
                  <span className="truncate">
                    {i + 1}. {s.titulo}
                  </span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {s.uso?.total} usos · {s.uso?.membros.size} membro(s)
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <NovaCategoria />

      {(categorias ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Crie uma categoria para começar.
          </CardContent>
        </Card>
      ) : (
        (categorias ?? []).map((c, ci) => {
          const itens = (scripts ?? []).filter((s) => s.categoria_id === c.id);
          return (
            <section key={c.id} className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  {c.nome}
                  {!c.ativo && <Badge variant="secondary">Escondida</Badge>}
                </h2>
                <CategoriaAcoes
                  id={c.id}
                  nome={c.nome}
                  ativo={c.ativo}
                  primeiro={ci === 0}
                  ultimo={ci === (categorias ?? []).length - 1}
                  totalScripts={itens.length}
                  inativos={itens.filter((s) => !s.ativo).length}
                />
              </div>
              {itens.length === 0 ? (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Nenhum script nesta categoria.
                </p>
              ) : (
                <ul className="flex flex-col divide-y rounded-xl border">
                  {itens.map((s, i) => {
                    const uso = usoPorScript.get(s.id);
                    return (
                      <li key={s.id} className={`flex flex-col gap-2 p-4 ${s.ativo ? "" : "opacity-70"}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{s.titulo}</span>
                          {!s.ativo && <Badge variant="outline">Rascunho</Badge>}
                          {uso && (
                            <span className="text-xs text-muted-foreground">
                              {uso.total} uso(s) em 30 dias
                            </span>
                          )}
                        </div>
                        <p className="line-clamp-3 text-sm whitespace-pre-wrap text-muted-foreground">
                          {s.texto}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <ScriptDialog
                            categorias={listaCategorias}
                            script={{
                              id: s.id,
                              categoriaId: s.categoria_id,
                              titulo: s.titulo,
                              texto: s.texto,
                              ativo: s.ativo,
                            }}
                          />
                          <ScriptAcoes
                            id={s.id}
                            titulo={s.titulo}
                            ativo={s.ativo}
                            primeiro={i === 0}
                            ultimo={i === itens.length - 1}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
