import "server-only";
import { sendEvolutionText } from "@/lib/evolution/client";
import { SITE_URL } from "@/lib/site-config";

// Aviso ao admin por WhatsApp, enviado pela instância de avisos (sem agente de
// IA). Configuração por env:
//   ADMIN_AVISOS_INSTANCE  instância da Evolution que envia (padrão: agenda-lembretes)
//   ADMIN_WHATSAPP         número do admin que recebe (55 + DDD + número)
// Sem ADMIN_WHATSAPP, não envia nada. Falha no aviso nunca derruba a ação.
export async function notificarAdmin(texto: string, caminho?: string) {
  const numero = process.env.ADMIN_WHATSAPP?.replace(/\D/g, "");
  if (!numero) return;
  const instancia = process.env.ADMIN_AVISOS_INSTANCE || "agenda-lembretes";
  const mensagem = caminho ? `${texto}\n\n${SITE_URL}${caminho}` : texto;

  try {
    await sendEvolutionText(instancia, numero, mensagem);
  } catch (err) {
    console.error("Falha ao avisar o admin no WhatsApp:", err);
  }
}
