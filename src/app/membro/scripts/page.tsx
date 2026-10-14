import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { ScriptsBrowser, type ScriptItem } from "./scripts-browser";

export default async function MembroScriptsPage() {
  const user = await requireMembro();
  const supabase = await createClient();

  // RLS devolve só categorias/scripts ativos, e só para membro aprovado.
  const [{ data: categorias }, { data: scripts }, { data: membro }, { data: usuario }, { data: perfil }] =
    await Promise.all([
      supabase.from("script_categorias").select("id, nome").order("ordem").order("nome"),
      supabase.from("scripts").select("id, categoria_id, titulo, texto").order("ordem").order("titulo"),
      supabase
        .from("membros")
        .select("link_recrutamento, link_energia")
        .eq("usuario_id", user.id)
        .single(),
      supabase.from("usuarios").select("nome_completo").eq("id", user.id).single(),
      supabase.from("perfil_conteudo").select("nome_exibicao").eq("usuario_id", user.id).maybeSingle(),
    ]);

  const nomePorCategoria = new Map((categorias ?? []).map((c) => [c.id, c.nome]));
  const ordemCategoria = new Map((categorias ?? []).map((c, i) => [c.id, i]));
  const itens: ScriptItem[] = (scripts ?? [])
    .filter((s) => nomePorCategoria.has(s.categoria_id))
    .sort((a, b) => (ordemCategoria.get(a.categoria_id) ?? 0) - (ordemCategoria.get(b.categoria_id) ?? 0))
    .map((s) => ({
      id: s.id,
      categoria: nomePorCategoria.get(s.categoria_id) ?? "",
      titulo: s.titulo,
      texto: s.texto,
    }));
  const categoriasComScript = (categorias ?? [])
    .map((c) => c.nome)
    .filter((nome) => itens.some((s) => s.categoria === nome));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Prospecção"
        title="Scripts"
        description="Mensagens prontas para cada momento da conversa. Digite o nome do contato, copie ou abra direto no WhatsApp."
      />

      {itens.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nenhum script por enquanto</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Assim que o administrador liberar os scripts, eles aparecem aqui.
          </CardContent>
        </Card>
      ) : (
        <ScriptsBrowser
          scripts={itens}
          categorias={categoriasComScript}
          meuNome={perfil?.nome_exibicao || usuario?.nome_completo || ""}
          meuLink={membro?.link_recrutamento ?? ""}
          linkEnergia={membro?.link_energia ?? ""}
        />
      )}
    </div>
  );
}
