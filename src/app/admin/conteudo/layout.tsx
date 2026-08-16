import { requireAdmin } from "@/lib/auth/guards";
import { AdminConteudoTabs } from "./admin-conteudo-tabs";

export default async function AdminConteudoLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <AdminConteudoTabs />
      {children}
    </div>
  );
}
