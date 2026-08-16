import { requireMembro } from "@/lib/auth/guards";
import { ConteudoTabs } from "./conteudo-tabs";

export default async function ConteudoLayout({ children }: { children: React.ReactNode }) {
  await requireMembro();

  return (
    <div className="flex flex-col gap-6">
      <ConteudoTabs />
      {children}
    </div>
  );
}
