import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database.types";

export type CurrentUser = {
  id: string;
  email: string | null;
  role: UserRole;
};

// Revalida a sessão contra o Auth server (nunca confia só no cookie decodificado).
// Usar em toda page/layout que precisa saber quem é o usuário, além do proxy.ts.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const role = (user.app_metadata as { role?: UserRole } | undefined)?.role;
  if (!role) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    role,
  };
}
