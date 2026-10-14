"use server";

import { requireMembroAprovado } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

// Registra o uso (para o ranking de scripts mais usados no admin). Falha aqui
// não pode atrapalhar o membro, então só loga.
export async function registrarUsoScript(scriptId: string, acao: "copiar" | "whatsapp") {
  const user = await requireMembroAprovado();
  const supabase = await createClient();
  const { error } = await supabase
    .from("script_usos")
    .insert({ script_id: scriptId, membro_id: user.id, acao });
  if (error) console.error("Falha ao registrar uso de script:", error);
}
