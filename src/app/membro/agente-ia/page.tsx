import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { WhatsappPanel } from "./whatsapp-panel";
import { ModoForm } from "./modo-form";
import { NomeAgenteForm } from "./nome-agente-form";

export default async function MembroAgenteIaPage() {
  const user = await requireMembro();
  const supabase = await createClient();

  const [{ data: sessao }, { data: membro }] = await Promise.all([
    supabase
      .from("whatsapp_sessions")
      .select("status, qr_code, phone_number")
      .eq("membro_id", user.id)
      .single(),
    supabase
      .from("membros")
      .select("modo_agente_ativo, nome_agente")
      .eq("usuario_id", user.id)
      .single(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Automação"
        title="Agente de IA"
        description="Conecte seu WhatsApp e deixe o agente prospectar por você."
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">WhatsApp</CardTitle>
          <CardDescription>Escaneie o QR Code para vincular seu número.</CardDescription>
        </CardHeader>
        <CardContent>
          <NomeAgenteForm nomeAgenteInicial={membro?.nome_agente ?? ""} />
          <WhatsappPanel
            membroId={user.id}
            sessaoInicial={{
              status: sessao?.status ?? "desconectado",
              qrCode: sessao?.qr_code ?? null,
              phoneNumber: sessao?.phone_number ?? null,
            }}
          />
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Modo do agente</CardTitle>
          <CardDescription>Define o prompt que o agente usa para conversar.</CardDescription>
        </CardHeader>
        <CardContent>
          <ModoForm modoAtivo={membro?.modo_agente_ativo ?? "recrutamento"} />
        </CardContent>
      </Card>
    </div>
  );
}
