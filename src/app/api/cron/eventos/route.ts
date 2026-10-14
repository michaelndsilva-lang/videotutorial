import { createAdminClient } from "@/lib/supabase/admin";
import { notificarNumero } from "@/lib/acesso/notificar-admin";
import { formatarEvento } from "@/lib/mural/agenda";
import { telefoneDoMembro } from "@/lib/radar/telefone";

export const maxDuration = 60;

// Chamado pelo pg_cron do Supabase a cada 10 min (Vercel Hobby só tem cron
// diário). Lembra por WhatsApp, 1 h antes, quem pediu "Quero ser lembrado".
// lembrete_enviado_em garante um envio só por evento.
export async function GET(request: Request) {
  const segredo = process.env.EVENTOS_CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const agora = new Date();
  const emUmaHora = new Date(agora.getTime() + 60 * 60 * 1000);
  const { data: eventos, error } = await admin
    .from("eventos")
    .select("id, titulo, inicio, link")
    .eq("ativo", true)
    .is("lembrete_enviado_em", null)
    .gt("inicio", agora.toISOString())
    .lte("inicio", emUmaHora.toISOString());
  if (error) {
    console.error("Cron eventos: falha ao buscar:", error);
    return Response.json({ ok: false }, { status: 500 });
  }

  let enviados = 0;
  for (const e of eventos ?? []) {
    // Marca antes de enviar: se duas execuções se sobrepuserem, só uma ganha.
    const { data: marcado } = await admin
      .from("eventos")
      .update({ lembrete_enviado_em: agora.toISOString() })
      .eq("id", e.id)
      .is("lembrete_enviado_em", null)
      .select("id");
    if (!marcado?.length) continue;

    const { data: inscritos } = await admin.from("evento_lembretes").select("membro_id").eq("evento_id", e.id);
    for (const { membro_id } of inscritos ?? []) {
      await notificarNumero(
        await telefoneDoMembro(membro_id),
        `⏰ ATL Prospect: "${e.titulo}" começa ${formatarEvento(e.inicio)} (horário de Brasília).${e.link ? `\n\nLink: ${e.link}` : ""}`
      );
      enviados++;
    }
  }

  return Response.json({ ok: true, eventos: eventos?.length ?? 0, enviados });
}
