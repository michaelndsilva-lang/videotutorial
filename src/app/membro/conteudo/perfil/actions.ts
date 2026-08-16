"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembro } from "@/lib/auth/guards";
import type { TomVozConteudo, NivelExperienciaConteudo } from "@/lib/types/database.types";

export type PerfilConteudoInput = {
  nomeExibicao: string;
  whatsapp: string;
  cidade: string;
  publicoAlvo: string;
  tomDeVoz: TomVozConteudo | "";
  nivelExperiencia: NivelExperienciaConteudo | "";
};

// Só fica liberado pro motor gerar conteúdo (Fase 3) quando os 6 campos
// estiverem preenchidos — ver seção 4 do prompt mestre.
export async function salvarPerfilConteudo(input: PerfilConteudoInput) {
  const user = await requireMembro();
  const supabase = await createClient();

  const nomeExibicao = input.nomeExibicao.trim();
  const whatsapp = input.whatsapp.trim();
  const cidade = input.cidade.trim();
  const publicoAlvo = input.publicoAlvo.trim();

  const onboardingCompleto = Boolean(
    nomeExibicao && whatsapp && cidade && publicoAlvo && input.tomDeVoz && input.nivelExperiencia
  );

  const { error } = await supabase.from("perfil_conteudo").upsert(
    {
      usuario_id: user.id,
      nome_exibicao: nomeExibicao || null,
      whatsapp: whatsapp || null,
      cidade: cidade || null,
      publico_alvo: publicoAlvo || null,
      tom_de_voz: input.tomDeVoz || null,
      nivel_experiencia: input.nivelExperiencia || null,
      onboarding_completo: onboardingCompleto,
    },
    { onConflict: "usuario_id" }
  );

  if (error) {
    throw new Error(`Não foi possível salvar seu perfil: ${error.message}`);
  }

  revalidatePath("/membro/conteudo/perfil");
  return { onboardingCompleto };
}
