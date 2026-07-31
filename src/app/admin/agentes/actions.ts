"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { AgenteModo } from "@/lib/types/database.types";

export async function atualizarPrompt(
  modo: AgenteModo,
  promptSistema: string,
  promptFollowup: string,
) {
  const user = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("agentes_config")
    .update({
      prompt_sistema: promptSistema,
      prompt_followup: promptFollowup,
      updated_by: user.id,
    })
    .eq("modo", modo);

  if (error) {
    throw new Error(`Não foi possível salvar o prompt: ${error.message}`);
  }

  revalidatePath("/admin/agentes");
}
