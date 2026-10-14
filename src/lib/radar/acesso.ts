import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// "Último acesso" do radar: gravado quando o membro navega na plataforma, no
// máximo uma vez por hora (o filtro no update evita escrita a cada clique).
// Falha aqui nunca atrapalha a navegação.
export async function registrarAcesso(membroId: string) {
  const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { error } = await createAdminClient()
    .from("membros")
    .update({ ultimo_acesso: new Date().toISOString() })
    .eq("usuario_id", membroId)
    .or(`ultimo_acesso.is.null,ultimo_acesso.lt.${umaHoraAtras}`);
  if (error) console.error("Falha ao registrar acesso:", error);
}
