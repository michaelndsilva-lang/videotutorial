"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MembroStatus } from "@/lib/types/database.types";

export async function setMembroStatus(usuarioId: string, status: MembroStatus) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("membros")
    .update({ status })
    .eq("usuario_id", usuarioId);

  if (error) {
    throw new Error(`Não foi possível atualizar o status: ${error.message}`);
  }

  revalidatePath("/admin/membros");
  revalidatePath(`/admin/membros/${usuarioId}`);
  revalidatePath("/admin/dashboard");
}

export async function removerMembro(usuarioId: string) {
  await requireAdmin();

  // Deleta via Auth Admin API: cascateia para usuarios, membros, kanban_boards/
  // columns/cards e whatsapp_sessions (todos com ON DELETE CASCADE).
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(usuarioId);

  if (error) {
    throw new Error(`Não foi possível remover o membro: ${error.message}`);
  }

  revalidatePath("/admin/membros");
  revalidatePath("/admin/dashboard");
}
