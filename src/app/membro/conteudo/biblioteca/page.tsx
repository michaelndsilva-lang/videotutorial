import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { FiltrosBiblioteca } from "./filtros-biblioteca";
import { BibliotecaGrid } from "./biblioteca-grid";
import type { ObjetivoConteudo, FormatoConteudo } from "@/lib/types/database.types";

export default async function BibliotecaPage({
  searchParams,
}: {
  searchParams: Promise<{ objetivo?: string; formato?: string; aba?: string }>;
}) {
  const user = await requireMembro();
  const { objetivo, formato, aba } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("conteudo_geracoes")
    .select("id, objetivo, formato, resultado, favorito, created_at")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);

  if (objetivo) query = query.eq("objetivo", objetivo as ObjetivoConteudo);
  if (formato) query = query.eq("formato", formato as FormatoConteudo);
  if (aba === "favoritos") query = query.eq("favorito", true);

  const { data: geracoes } = await query;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Motor de Conteúdo"
        title="Minha Biblioteca"
        description="Seu histórico de gerações — copie de novo sem gastar crédito."
      />
      <FiltrosBiblioteca objetivo={objetivo} formato={formato} aba={aba} />
      <BibliotecaGrid itensIniciais={geracoes ?? []} apenasFavoritos={aba === "favoritos"} />
    </div>
  );
}
