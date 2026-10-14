import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LinhaRadar, PedidoView } from "@/components/radar-equipe";
import { corRadar, diasDesde } from "./radar";

// Radar visível para quem está logado: admin vê todos; membro vê a própria
// linha descendente (a função radar_equipe() decide no banco).
export async function carregarRadar(liderId?: string): Promise<LinhaRadar[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("radar_equipe");
  if (error) throw new Error(`Falha ao carregar o radar: ${error.message}`);
  const linhas = data ?? [];
  const agora = new Date().getTime();
  const nomePorId = new Map(linhas.map((l) => [l.membro_id, l.nome]));
  const paiPorId = new Map(linhas.map((l) => [l.membro_id, l.patrocinador_id]));

  // Nível na linha do líder (1 = indicado direto).
  function nivel(id: string): number | undefined {
    if (!liderId) return undefined;
    let n = 1;
    let pai = paiPorId.get(id);
    while (pai && pai !== liderId && n < 50) {
      pai = paiPorId.get(pai);
      n++;
    }
    return n;
  }

  return linhas
    .map((l) => {
      const dias = Math.max(0, diasDesde(l.ultima_atividade, agora) ?? 999);
      return {
        id: l.membro_id,
        nome: l.nome,
        telefone: l.telefone,
        patrocinador: l.patrocinador_id ? (nomePorId.get(l.patrocinador_id) ?? null) : null,
        nivel: nivel(l.membro_id),
        dias,
        cor: corRadar(dias),
        ultimoAcesso: l.ultimo_acesso,
        leads7d: Number(l.leads_7d),
        ajudasAbertas: Number(l.ajudas_abertas),
      };
    })
    .sort((a, b) => b.dias - a.dias);
}

// Pedidos visíveis (RLS: admin todos; líder os da própria linha), abertos
// primeiro, e os resolvidos dos últimos 30 dias.
export async function carregarPedidos(excluirMembroId?: string): Promise<PedidoView[]> {
  const supabase = await createClient();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 30);
  let query = supabase
    .from("pedidos_ajuda")
    .select("id, membro_id, categoria, mensagem, status, resposta, created_at, membros(usuarios(nome_completo, email))")
    .or(`status.neq.resolvido,updated_at.gte.${inicio.toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(50);
  if (excluirMembroId) query = query.neq("membro_id", excluirMembroId);
  const { data, error } = await query;
  if (error) throw new Error(`Falha ao carregar pedidos: ${error.message}`);
  const ordem: Record<string, number> = { aberto: 0, em_atendimento: 1, resolvido: 2 };
  return (data ?? [])
    .map((p) => ({
      id: p.id,
      membro: p.membros?.usuarios?.nome_completo || p.membros?.usuarios?.email || "Membro",
      categoria: p.categoria,
      mensagem: p.mensagem,
      status: p.status,
      resposta: p.resposta,
      criadoEm: p.created_at,
    }))
    .sort((a, b) => (ordem[a.status] ?? 3) - (ordem[b.status] ?? 3));
}
