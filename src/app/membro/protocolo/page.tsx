import { CriacaoProtocolo } from "@/components/criacao-protocolo";
import { requireMembro } from "@/lib/auth/guards";

export default async function MembroProtocoloPage() {
  await requireMembro();
  return <CriacaoProtocolo />;
}
