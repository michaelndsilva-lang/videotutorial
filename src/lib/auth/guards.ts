import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { MembroStatus } from "@/lib/types/database.types";

// Chamar no topo de todo layout/page sob /admin. O proxy.ts já bloqueia a rota,
// mas a UI não deve depender só dele.
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }
  return user;
}

export type CurrentMembro = CurrentUser & { status: MembroStatus };

// Chamar no topo de todo layout/page sob /membro. Também traz o status de
// aprovação, já que membro pendente/inativo não deve ver o app completo.
export async function requireMembro(): Promise<CurrentMembro> {
  const user = await getCurrentUser();
  if (!user || user.role !== "membro") {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("membros")
    .select("status")
    .eq("usuario_id", user.id)
    .single();

  return { ...user, status: data?.status ?? "pendente" };
}
