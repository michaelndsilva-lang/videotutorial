"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { CATALOGOS_BUCKET, CATALOGO_PDF_MAX_BYTES, CATALOGO_TIPOS } from "@/lib/recrutamento/catalogos";
import type { AgenteModo, CatalogoTipo } from "@/lib/types/database.types";

export async function atualizarPrompt(
  modo: AgenteModo,
  promptSistema: string,
  promptFollowup: string,
) {
  const user = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("agentes_config")
    .update({
      prompt_sistema: promptSistema,
      prompt_followup: promptFollowup,
      updated_by: user.id,
    })
    .eq("modo", modo);

  if (error) {
    throw new Error(`Não foi possível salvar o prompt: ${error.message}`);
  }

  revalidatePath("/admin/agentes");
}

// Chamada depois que o browser já subiu o PDF direto no Storage (o limite de
// corpo das functions da Vercel é ~4.5 MB). Substitui o arquivo anterior do
// mesmo catálogo, se houver.
export async function registrarCatalogo(input: {
  tipo: CatalogoTipo;
  storagePath: string;
  nomeArquivo: string;
}) {
  const user = await requireAdmin();
  const supabase = await createClient();

  async function descartar(mensagem: string): Promise<never> {
    await supabase.storage.from(CATALOGOS_BUCKET).remove([input.storagePath]);
    throw new Error(mensagem);
  }

  if (!CATALOGO_TIPOS.includes(input.tipo) || !input.storagePath.startsWith(`${input.tipo}/`)) {
    throw new Error("Arquivo inválido.");
  }

  const { data: arquivo, error: downloadError } = await supabase.storage
    .from(CATALOGOS_BUCKET)
    .download(input.storagePath);
  if (downloadError || !arquivo) throw new Error("Não foi possível ler o arquivo enviado.");
  if (arquivo.size > CATALOGO_PDF_MAX_BYTES) {
    await descartar(`Arquivo acima do limite de ${Math.round(CATALOGO_PDF_MAX_BYTES / 1024 / 1024)} MB.`);
  }

  const { data: anterior } = await supabase
    .from("recrutamento_catalogos")
    .select("storage_path")
    .eq("tipo", input.tipo)
    .maybeSingle();

  const { error } = await supabase.from("recrutamento_catalogos").upsert({
    tipo: input.tipo,
    storage_path: input.storagePath,
    nome_arquivo: input.nomeArquivo,
    tamanho_bytes: arquivo.size,
    updated_by: user.id,
  });
  if (error) await descartar(`Não foi possível salvar: ${error.message}`);

  if (anterior && anterior.storage_path !== input.storagePath) {
    await supabase.storage.from(CATALOGOS_BUCKET).remove([anterior.storage_path]);
  }

  revalidatePath("/admin/agentes");
}

export async function removerCatalogo(tipo: CatalogoTipo) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: catalogo } = await supabase
    .from("recrutamento_catalogos")
    .select("storage_path")
    .eq("tipo", tipo)
    .maybeSingle();
  if (!catalogo) throw new Error("PDF não encontrado.");

  const { error } = await supabase.from("recrutamento_catalogos").delete().eq("tipo", tipo);
  if (error) throw new Error(`Não foi possível remover: ${error.message}`);

  await supabase.storage.from(CATALOGOS_BUCKET).remove([catalogo.storage_path]);

  revalidatePath("/admin/agentes");
}
