import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { CursoPlayer, type AulaView } from "./curso-player";

export default async function MembroCursoPage({
  params,
  searchParams,
}: {
  params: Promise<{ cursoId: string }>;
  searchParams: Promise<{ aula?: string }>;
}) {
  const [{ cursoId }, { aula: aulaParam }] = await Promise.all([params, searchParams]);
  const user = await requireMembro();
  const supabase = await createClient();

  // RLS: curso/aulas inativos (ou membro não aprovado) simplesmente não vêm.
  const [{ data: curso }, { data: aulas }, { data: progresso }] = await Promise.all([
    supabase.from("cursos").select("id, titulo, descricao").eq("id", cursoId).maybeSingle(),
    supabase
      .from("aulas")
      .select("id, titulo, descricao, video_url")
      .eq("curso_id", cursoId)
      .order("ordem")
      .order("created_at"),
    supabase.from("aula_progresso").select("aula_id").eq("membro_id", user.id),
  ]);
  if (!curso || !aulas?.length) notFound();

  const feitas = new Set((progresso ?? []).map((p) => p.aula_id));
  const lista: AulaView[] = aulas.map((a) => ({
    id: a.id,
    titulo: a.titulo,
    descricao: a.descricao,
    videoUrl: a.video_url,
    feita: feitas.has(a.id),
  }));
  // Sem ?aula: abre a primeira ainda não assistida.
  const atual =
    lista.find((a) => a.id === aulaParam)?.id ?? lista.find((a) => !a.feita)?.id ?? lista[0].id;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/membro/treinamentos"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Treinamentos
      </Link>
      <PageHeader eyebrow="ATL FLIX" title={curso.titulo} description={curso.descricao || undefined} />
      <CursoPlayer cursoId={curso.id} aulas={lista} aulaAtualId={atual} />
    </div>
  );
}
