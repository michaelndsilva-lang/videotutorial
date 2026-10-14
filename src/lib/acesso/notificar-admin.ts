import "server-only";
import { sendEvolutionText } from "@/lib/evolution/client";
import { SITE_URL } from "@/lib/site-config";

// Avisos por WhatsApp, enviados pela instância de avisos (sem agente de IA).
// Configuração por env:
//   ADMIN_AVISOS_INSTANCE  instância da Evolution que envia (padrão: agenda-lembretes)
//   ADMIN_WHATSAPP         número do admin que recebe (55 + DDD + número)
// Falha no aviso nunca derruba a ação.

function montar(texto: string, caminho?: string) {
  return caminho ? `${texto}\n\n${SITE_URL}${caminho}` : texto;
}

export async function notificarNumero(numero: string | null, texto: string, caminho?: string) {
  let digitos = numero?.replace(/\D/g, "") ?? "";
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  if (!/^55\d{10,11}$/.test(digitos)) return;
  const instancia = process.env.ADMIN_AVISOS_INSTANCE || "agenda-lembretes";
  try {
    await sendEvolutionText(instancia, digitos, montar(texto, caminho));
  } catch (err) {
    console.error("Falha ao enviar aviso no WhatsApp:", err);
  }
}

// Sem ADMIN_WHATSAPP, não envia nada.
export async function notificarAdmin(texto: string, caminho?: string) {
  await notificarNumero(process.env.ADMIN_WHATSAPP ?? null, texto, caminho);
}
