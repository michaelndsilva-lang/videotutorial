import { requireAdmin } from "@/lib/auth/guards";
import { signOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { NavShell } from "@/components/nav-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  // Pendências no menu: cadastros aguardando aprovação + pedidos de robô.
  const supabase = await createClient();
  const [{ count: cadastros }, { count: pedidosRobo }, { count: ajudas }] = await Promise.all([
    supabase.from("membros").select("*", { count: "exact", head: true }).eq("status", "pendente"),
    supabase
      .from("robo_acesso")
      .select("membro_id", { count: "exact", head: true })
      .eq("status", "solicitado"),
    supabase.from("pedidos_ajuda").select("id", { count: "exact", head: true }).eq("status", "aberto"),
  ]);

  return (
    <NavShell
      role="admin"
      userEmail={user.email}
      signOutAction={signOut}
      badges={{
        "/admin/membros": (cadastros ?? 0) + (pedidosRobo ?? 0),
        "/admin/radar": ajudas ?? 0,
      }}
    >
      {children}
    </NavShell>
  );
}
