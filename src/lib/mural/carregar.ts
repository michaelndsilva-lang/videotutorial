import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AvisoView, ConquistaView, EventoView } from "@/components/mural";

// RLS já filtra: avisos ativos/não expirados, eventos ativos, conquistas não
// ocultas — tudo só para membro aprovado.
export async function carregarAvisos(apenasFixados = false): Promise<AvisoView[]> {
  const supabase = await createClient();
  let q = supabase
    .from("avisos")
    .select("id, titulo, texto, fixado, created_at")
    .order("fixado", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);
  if (apenasFixados) q = q.eq("fixado", true);
  const { data } = await q;
  return (data ?? []).map((a) => ({ id: a.id, titulo: a.titulo, texto: a.texto, fixado: a.fixado, criadoEm: a.created_at }));
}

export async function carregarEventos(membroId: string, limite = 10): Promise<EventoView[]> {
  const supabase = await createClient();
  // Eventos que ainda não terminaram (até 10 h atrás cobre qualquer duração).
  const desde = new Date(new Date().getTime() - 10 * 60 * 60 * 1000).toISOString();
  const [{ data: eventos }, { data: lembretes }] = await Promise.all([
    supabase
      .from("eventos")
      .select("id, titulo, descricao, inicio, duracao_min, link")
      .gte("inicio", desde)
      .order("inicio")
      .limit(limite + 5),
    supabase.from("evento_lembretes").select("evento_id").eq("membro_id", membroId),
  ]);
  const meus = new Set((lembretes ?? []).map((l) => l.evento_id));
  const agora = new Date().getTime();
  return (eventos ?? [])
    .filter((e) => new Date(e.inicio).getTime() + e.duracao_min * 60 * 1000 > agora)
    .slice(0, limite)
    .map((e) => ({
      id: e.id,
      titulo: e.titulo,
      descricao: e.descricao,
      inicio: e.inicio,
      duracaoMin: e.duracao_min,
      link: e.link,
      lembrar: meus.has(e.id),
    }));
}

export async function carregarConquistas(membroId: string): Promise<ConquistaView[]> {
  const supabase = await createClient();
  const { data: conquistas } = await supabase
    .from("conquistas")
    .select("id, membro_id, texto, created_at, membros(usuarios(nome_completo, email))")
    .order("created_at", { ascending: false })
    .limit(30);
  const ids = (conquistas ?? []).map((c) => c.id);
  const { data: curtidas } = ids.length
    ? await supabase.from("conquista_curtidas").select("conquista_id, membro_id").in("conquista_id", ids)
    : { data: [] };
  return (conquistas ?? []).map((c) => {
    const destas = (curtidas ?? []).filter((x) => x.conquista_id === c.id);
    return {
      id: c.id,
      autor: c.membros?.usuarios?.nome_completo || c.membros?.usuarios?.email || "Membro",
      texto: c.texto,
      criadoEm: c.created_at,
      curtidas: destas.length,
      curti: destas.some((x) => x.membro_id === membroId),
      minha: c.membro_id === membroId,
    };
  });
}
