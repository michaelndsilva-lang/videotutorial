import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// WhatsApp de contato de um membro: o da página pessoal, o do perfil de
// conteúdo ou, por último, o número conectado ao robô.
export async function telefoneDoMembro(membroId: string): Promise<string | null> {
  const admin = createAdminClient();
  const [{ data: pagina }, { data: perfil }, { data: sessao }] = await Promise.all([
    admin.from("paginas").select("whatsapp").eq("membro_id", membroId).maybeSingle(),
    admin.from("perfil_conteudo").select("whatsapp").eq("usuario_id", membroId).maybeSingle(),
    admin.from("whatsapp_sessions").select("phone_number").eq("membro_id", membroId).maybeSingle(),
  ]);
  const candidatos = [pagina?.whatsapp, perfil?.whatsapp, sessao?.phone_number];
  for (const c of candidatos) {
    const d = c?.replace(/\D/g, "") ?? "";
    if (d.length >= 10) return d;
  }
  return null;
}

export async function nomeDoMembro(membroId: string): Promise<string> {
  const admin = createAdminClient();
  const [{ data: perfil }, { data: usuario }] = await Promise.all([
    admin.from("perfil_conteudo").select("nome_exibicao").eq("usuario_id", membroId).maybeSingle(),
    admin.from("usuarios").select("nome_completo, email").eq("id", membroId).single(),
  ]);
  return perfil?.nome_exibicao || usuario?.nome_completo || usuario?.email || "Membro";
}
