"use server";

import { revalidatePath } from "next/cache";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  SUNNE_BUCKET,
  SUNNE_PDF_MAX_BYTES,
  SUNNE_VIDEO_MAX_BYTES,
  extrairTextoPdf,
} from "@/lib/sunne/materiais";
import type { SunneMaterialTipo } from "@/lib/types/database.types";

// Toda action do SUNNE confere a liberação do membro no servidor — a tela só
// aparece para quem está liberado, mas server actions são endpoints públicos.
// As tabelas/bucket também têm RLS por private.sunne_habilitado (0023).
async function requireSunne() {
  const user = await requireMembro();
  const supabase = await createClient();
  const { data } = await supabase
    .from("membros")
    .select("sunne_habilitado")
    .eq("usuario_id", user.id)
    .single();
  if (!data?.sunne_habilitado) {
    throw new Error("Recurso não disponível.");
  }
  return { user, supabase };
}

export async function salvarPromptsSunne(promptSistema: string, promptFollowup: string) {
  const { user, supabase } = await requireSunne();

  const { error } = await supabase
    .from("sunne_config")
    .upsert({ membro_id: user.id, prompt_sistema: promptSistema, prompt_followup: promptFollowup });
  if (error) throw new Error(`Não foi possível salvar: ${error.message}`);

  revalidatePath("/membro/agente-ia");
}

// Chamada depois que o browser já subiu o arquivo direto no Storage (o limite
// de corpo das functions da Vercel é ~4.5 MB, pequeno demais para vídeo/PDF).
export async function registrarMaterialSunne(input: {
  tipo: SunneMaterialTipo;
  titulo: string;
  descricao: string;
  storagePath: string;
  mimeType: string;
}) {
  const { user, supabase } = await requireSunne();

  const titulo = input.titulo.trim();
  const descricao = input.descricao.trim();
  const esperado = input.tipo === "pdf" ? "application/pdf" : "video/mp4";

  async function descartar(mensagem: string): Promise<never> {
    await supabase.storage.from(SUNNE_BUCKET).remove([input.storagePath]);
    throw new Error(mensagem);
  }

  if (!input.storagePath.startsWith(`${user.id}/`)) throw new Error("Arquivo inválido.");
  if (!titulo) await descartar("Informe um título.");
  if (input.mimeType !== esperado) {
    await descartar(input.tipo === "pdf" ? "Envie um arquivo PDF." : "Envie um vídeo em MP4.");
  }
  if (input.tipo === "video" && !descricao) {
    await descartar("Descreva quando o agente deve enviar este vídeo.");
  }

  const { data: arquivo, error: downloadError } = await supabase.storage
    .from(SUNNE_BUCKET)
    .download(input.storagePath);
  if (downloadError || !arquivo) throw new Error("Não foi possível ler o arquivo enviado.");

  const limite = input.tipo === "pdf" ? SUNNE_PDF_MAX_BYTES : SUNNE_VIDEO_MAX_BYTES;
  if (arquivo.size > limite) {
    await descartar(`Arquivo acima do limite de ${Math.round(limite / 1024 / 1024)} MB.`);
  }

  let conteudoTexto: string | null = null;
  if (input.tipo === "pdf") {
    try {
      conteudoTexto = await extrairTextoPdf(new Uint8Array(await arquivo.arrayBuffer()));
    } catch (err) {
      console.error("Falha ao extrair texto do PDF (SUNNE):", err);
      await descartar("Não foi possível ler este PDF.");
    }
    if (!conteudoTexto) {
      await descartar(
        "Este PDF não tem texto selecionável (parece ser imagem escaneada). Envie uma versão com texto."
      );
    }
  }

  const { error } = await supabase.from("sunne_materiais").insert({
    membro_id: user.id,
    tipo: input.tipo,
    titulo,
    descricao,
    storage_path: input.storagePath,
    mime_type: input.mimeType,
    tamanho_bytes: arquivo.size,
    conteudo_texto: conteudoTexto,
  });
  if (error) await descartar(`Não foi possível salvar: ${error.message}`);

  revalidatePath("/membro/agente-ia");
}

export async function removerMaterialSunne(id: string) {
  const { supabase } = await requireSunne();

  const { data: material } = await supabase
    .from("sunne_materiais")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (!material) throw new Error("Material não encontrado.");

  const { error } = await supabase.from("sunne_materiais").delete().eq("id", id);
  if (error) throw new Error(`Não foi possível remover: ${error.message}`);

  await supabase.storage.from(SUNNE_BUCKET).remove([material.storage_path]);

  revalidatePath("/membro/agente-ia");
}
