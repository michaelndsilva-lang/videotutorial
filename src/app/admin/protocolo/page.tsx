import { CriacaoProtocolo } from "@/components/criacao-protocolo";
import { requireAdmin } from "@/lib/auth/guards";

export default async function AdminProtocoloPage() {
  await requireAdmin();
  return <CriacaoProtocolo />;
}
