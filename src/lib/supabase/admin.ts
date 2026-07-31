import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// Client service-role: ignora RLS. Uso exclusivo de rotas /admin (aprovar/remover
// membro, editar prompts) e de webhook handlers que ainda não têm um JWT de usuário.
// NUNCA importar este módulo em código que roda no browser.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
