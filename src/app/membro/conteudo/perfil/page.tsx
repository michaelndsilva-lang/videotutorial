import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { PerfilConteudoForm } from "./perfil-form";

export default async function PerfilConteudoPage() {
  const user = await requireMembro();
  const supabase = await createClient();

  const { data: perfil } = await supabase
    .from("perfil_conteudo")
    .select("nome_exibicao, whatsapp, cidade, publico_alvo, tom_de_voz, nivel_experiencia, onboarding_completo")
    .eq("usuario_id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Motor de Conteúdo"
        title="Meu Perfil de Conteúdo"
        description="Preencha uma única vez — leva menos de 1 minuto e libera o motor de conteúdo."
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Seus dados</CardTitle>
          <CardDescription>Usados pela IA pra escrever na sua voz, pro seu público.</CardDescription>
        </CardHeader>
        <CardContent>
          <PerfilConteudoForm
            nomeExibicao={perfil?.nome_exibicao ?? ""}
            whatsapp={perfil?.whatsapp ?? ""}
            cidade={perfil?.cidade ?? ""}
            publicoAlvo={perfil?.publico_alvo ?? ""}
            tomDeVoz={perfil?.tom_de_voz ?? ""}
            nivelExperiencia={perfil?.nivel_experiencia ?? ""}
            onboardingCompleto={perfil?.onboarding_completo ?? false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
