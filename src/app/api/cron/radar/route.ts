import { createAdminClient } from "@/lib/supabase/admin";
import { notificarAdmin, notificarNumero } from "@/lib/acesso/notificar-admin";
import { diasDesde } from "@/lib/radar/radar";
import { telefoneDoMembro } from "@/lib/radar/telefone";

export const maxDuration = 60;

// Vercel Cron diário (vercel.json): avisa no WhatsApp quem entrou no vermelho
// (6 dias sem atividade = passou hoje do limite de 5). O admin recebe a lista
// completa; cada patrocinador direto recebe só os da própria equipe.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("radar_equipe");
  if (error) {
    console.error("Cron radar: falha ao carregar:", error);
    return Response.json({ ok: false }, { status: 500 });
  }

  const agora = new Date().getTime();
  const linhas = (data ?? []).map((l) => ({ ...l, dias: diasDesde(l.ultima_atividade, agora) ?? 0 }));
  const novos = linhas.filter((l) => l.dias === 6);
  const vermelhos = linhas.filter((l) => l.dias > 5).length;
  if (novos.length === 0) return Response.json({ ok: true, novos: 0 });

  const lista = novos.map((l) => `• ${l.nome}`).join("\n");
  await notificarAdmin(
    `🔴 ATL Prospect: ${novos.length} membro(s) entraram no vermelho hoje (6 dias sem atividade):\n${lista}\n\nTotal no vermelho: ${vermelhos}.`,
    "/admin/radar"
  );

  const porPatrocinador = new Map<string, string[]>();
  for (const l of novos) {
    if (!l.patrocinador_id) continue;
    porPatrocinador.set(l.patrocinador_id, [...(porPatrocinador.get(l.patrocinador_id) ?? []), l.nome]);
  }
  for (const [patrocinadorId, nomes] of porPatrocinador) {
    await notificarNumero(
      await telefoneDoMembro(patrocinadorId),
      `🔴 ATL Prospect: da sua equipe, ${nomes.join(", ")} ${nomes.length > 1 ? "estão" : "está"} há 6 dias sem atividade. Que tal mandar uma mensagem?`,
      "/membro/equipe"
    );
  }

  return Response.json({ ok: true, novos: novos.length });
}
