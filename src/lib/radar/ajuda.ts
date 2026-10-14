import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificarNumero } from "@/lib/acesso/notificar-admin";
import { CATEGORIA_AJUDA, STATUS_AJUDA } from "./radar";
import { nomeDoMembro, telefoneDoMembro } from "./telefone";

// Atualiza um pedido de ajuda (admin ou alguém acima na linha) e avisa o
// membro pelo WhatsApp quando há resposta ou o pedido foi resolvido. A
// permissão já foi conferida pela policy de update, feita com o client do
// usuário em quem chama; aqui só lemos com service-role para o aviso.
export async function avisarMembroSobrePedido(pedidoId: string) {
  const admin = createAdminClient();
  const { data: p } = await admin
    .from("pedidos_ajuda")
    .select("membro_id, categoria, status, resposta")
    .eq("id", pedidoId)
    .single();
  if (!p || (!p.resposta && p.status !== "resolvido")) return;
  const telefone = await telefoneDoMembro(p.membro_id);
  const texto = [
    `🙋 ATL Prospect: seu pedido de ajuda (${CATEGORIA_AJUDA[p.categoria] ?? p.categoria}) está ${STATUS_AJUDA[p.status]?.toLowerCase() ?? p.status}.`,
    p.resposta ? `\nResposta: ${p.resposta}` : "",
  ].join("");
  await notificarNumero(telefone, texto, "/membro/ajuda");
}

// Aviso de pedido novo para o patrocinador direto (o admin é avisado à parte).
export async function avisarPatrocinadorPedidoNovo(membroId: string, categoria: string, mensagem: string) {
  const admin = createAdminClient();
  const { data: m } = await admin.from("membros").select("patrocinador_id").eq("usuario_id", membroId).single();
  if (!m?.patrocinador_id) return;
  const [telefone, nome] = await Promise.all([telefoneDoMembro(m.patrocinador_id), nomeDoMembro(membroId)]);
  await notificarNumero(
    telefone,
    `🙋 ATL Prospect: ${nome}, da sua equipe, pediu ajuda (${CATEGORIA_AJUDA[categoria] ?? categoria}):\n"${mensagem.slice(0, 300)}"`,
    "/membro/equipe"
  );
}
