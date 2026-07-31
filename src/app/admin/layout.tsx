import { requireAdmin } from "@/lib/auth/guards";
import { signOut } from "@/lib/auth/actions";
import { NavShell } from "@/components/nav-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <NavShell role="admin" userEmail={user.email} signOutAction={signOut}>
      {children}
    </NavShell>
  );
}
