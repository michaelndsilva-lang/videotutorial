import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { WhatsappPanel } from "./whatsapp-panel";
import { ModoForm } from "./modo-form";
import { NomeAgenteForm } from "./nome-agente-form";
import { SunnePanel, type MaterialSunne } from "./sunne-panel";

// Upload de PDF do SUNNE extrai o texto na server action desta página.
export const maxDuration = 60;

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
      .select("modo_agente_ativo, nome_agente, genero_agente, sunne_habilitado")
      .eq("usuario_id", user.id)
      .single(),
  ]);

  // SUNNE é exclusivo: só é carregado (e renderizado) para quem foi liberado.
  const sunneHabilitado = membro?.sunne_habilitado === true;
  const [sunneConfigRes, sunneMateriaisRes] = sunneHabilitado
    ? await Promise.all([
        supabase
          .from("sunne_config")
          .select("prompt_sistema, prompt_followup")
          .eq("membro_id", user.id)
          .maybeSingle(),
        supabase
          .from("sunne_materiais")
          .select("id, tipo, titulo, descricao, tamanho_bytes, conteudo_texto")
          .eq("membro_id", user.id)
          .order("created_at"),
      ])
    : [null, null];
  const materiaisSunne: MaterialSunne[] = (sunneMateriaisRes?.data ?? []).map((m) => ({
    id: m.id,
    tipo: m.tipo as MaterialSunne["tipo"],
    titulo: m.titulo,
    descricao: m.descricao,
    tamanho_bytes: m.tamanho_bytes,
    caracteres: m.conteudo_texto ? m.conteudo_texto.length : null,
  }));

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
          <NomeAgenteForm
            nomeAgenteInicial={membro?.nome_agente ?? ""}
            generoAgenteInicial={(membro?.genero_agente as "masculino" | "feminino" | null) ?? null}
          />
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
          <ModoForm
            modoAtivo={membro?.modo_agente_ativo ?? "recrutamento"}
            sunneHabilitado={sunneHabilitado}
          />
        </CardContent>
      </Card>

      {sunneHabilitado ? (
        <SunnePanel
          membroId={user.id}
          promptInicial={sunneConfigRes?.data?.prompt_sistema ?? ""}
          followupInicial={sunneConfigRes?.data?.prompt_followup ?? ""}
          materiais={materiaisSunne}
          ativo={membro?.modo_agente_ativo === "sunne"}
        />
      ) : null}
    </div>
  );
}
