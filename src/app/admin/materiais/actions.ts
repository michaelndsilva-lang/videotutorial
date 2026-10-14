"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { registrarLog } from "@/lib/acesso/log";
import {
  MATERIAIS_BUCKET,
  MATERIAL_MAX_BYTES,
  MATERIAL_MIMES,
  MATERIAL_TIPOS,
} from "@/lib/materiais/config";
import type { MaterialTipo } from "@/lib/types/database.types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ArquivoEnviado = { path: string; nomeArquivo: string };

export type MaterialInput = {
  tipo: MaterialTipo;
  categoria: string;
  titulo: string;
  descricao: string;
  permitirDownload: boolean;
  compartilhavel: boolean;
  videoUrl?: string | null;
};

function revalidar() {
  revalidatePath("/admin/materiais");
  revalidatePath("/membro/materiais");
  revalidatePath("/admin/logs");
}

function validarTexto(input: MaterialInput) {
  if (!MATERIAL_TIPOS.includes(input.tipo)) throw new Error("Tipo de material inválido.");
  const categoria = input.categoria.trim();
  const titulo = input.titulo.trim();
  const descricao = input.descricao.trim();
  if (!categoria || categoria.length > 60) throw new Error("Informe uma categoria (até 60 caracteres).");
  if (!titulo || titulo.length > 120) throw new Error("Informe um título (até 120 caracteres).");
  if (descricao.length > 1000) throw new Error("A descrição pode ter até 1000 caracteres.");
  return { categoria, titulo, descricao };
}

function validarVideoUrl(url: string | null | undefined) {
  const limpa = url?.trim();
  if (!limpa) return null;
  if (!/^https:\/\/\S+$/i.test(limpa)) throw new Error("O link do vídeo precisa começar com https://");
  return limpa;
}

// O upload vai direto do navegador do admin para o Storage (policy só-admin).
// Aqui conferimos que o objeto existe, tem tamanho e tipo aceitos para o
// material — se não, apaga o arquivo e recusa.
async function conferirArquivo(supabase: Supabase, tipo: MaterialTipo, arquivo: ArquivoEnviado) {
  async function descartar(mensagem: string): Promise<never> {
    await supabase.storage.from(MATERIAIS_BUCKET).remove([arquivo.path]);
    throw new Error(mensagem);
  }

  if (!arquivo.path.startsWith(`${tipo}/`)) await descartar("Arquivo inválido.");

  const corte = arquivo.path.lastIndexOf("/");
  const pasta = arquivo.path.slice(0, corte);
  const nome = arquivo.path.slice(corte + 1);
  const { data, error } = await supabase.storage
    .from(MATERIAIS_BUCKET)
    .list(pasta, { search: nome, limit: 5 });
  const objeto = data?.find((o) => o.name === nome);
  if (error || !objeto) throw new Error("Não foi possível ler o arquivo enviado.");

  const tamanho = Number(objeto.metadata?.size ?? 0);
  const mime = String(objeto.metadata?.mimetype ?? "");
  if (!tamanho || tamanho > MATERIAL_MAX_BYTES) await descartar("Arquivo vazio ou acima de 50 MB.");
  if (!MATERIAL_MIMES[tipo].includes(mime)) await descartar("Formato de arquivo não aceito para este tipo.");

  return { tamanho, mime };
}

export async function criarMaterial(input: MaterialInput, arquivo: ArquivoEnviado | null) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { categoria, titulo, descricao } = validarTexto(input);
  const videoUrl = input.tipo === "video" ? validarVideoUrl(input.videoUrl) : null;

  if (!arquivo && !videoUrl) {
    throw new Error(input.tipo === "video" ? "Envie um arquivo MP4 ou informe o link." : "Envie o arquivo.");
  }

  const dadosArquivo = arquivo ? await conferirArquivo(supabase, input.tipo, arquivo) : null;

  // Entra no fim da categoria.
  const { data: ultimo } = await supabase
    .from("materiais")
    .select("ordem")
    .eq("categoria", categoria)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: criado, error } = await supabase
    .from("materiais")
    .insert({
      tipo: input.tipo,
      categoria,
      titulo,
      descricao,
      permitir_download: input.permitirDownload,
      compartilhavel: input.compartilhavel,
      arquivo_path: arquivo?.path ?? null,
      nome_arquivo: arquivo?.nomeArquivo ?? null,
      mime_type: dadosArquivo?.mime ?? null,
      tamanho_bytes: dadosArquivo?.tamanho ?? null,
      video_url: arquivo ? null : videoUrl,
      ordem: (ultimo?.ordem ?? -1) + 1,
      created_by: admin.id,
    })
    .select("id")
    .single();
  if (error) {
    if (arquivo) await supabase.storage.from(MATERIAIS_BUCKET).remove([arquivo.path]);
    throw new Error(`Não foi possível salvar: ${error.message}`);
  }

  await registrarLog({
    atorId: admin.id,
    membroId: null,
    acao: "material_criado",
    detalhes: { material_id: criado.id, titulo, tipo: input.tipo },
  });
  revalidar();
}

export async function atualizarMaterial(
  id: string,
  input: Omit<MaterialInput, "tipo">,
  novoArquivo: ArquivoEnviado | null
) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: atual } = await supabase
    .from("materiais")
    .select("tipo, arquivo_path, video_url")
    .eq("id", id)
    .single();
  if (!atual) throw new Error("Material não encontrado.");
  const tipo = atual.tipo as MaterialTipo;

  const { categoria, titulo, descricao } = validarTexto({ ...input, tipo });
  const videoUrl = tipo === "video" ? validarVideoUrl(input.videoUrl) : null;
  const dadosArquivo = novoArquivo ? await conferirArquivo(supabase, tipo, novoArquivo) : null;

  // Vídeo pode trocar de link para arquivo (ou o contrário); os demais tipos
  // sempre têm arquivo e só trocam se vier um novo.
  const usarLink = tipo === "video" && !novoArquivo && !!videoUrl;
  if (!usarLink && !novoArquivo && !atual.arquivo_path) {
    throw new Error("Envie um arquivo MP4 ou informe o link.");
  }

  const { error } = await supabase
    .from("materiais")
    .update({
      categoria,
      titulo,
      descricao,
      permitir_download: input.permitirDownload,
      compartilhavel: input.compartilhavel,
      ...(novoArquivo
        ? {
            arquivo_path: novoArquivo.path,
            nome_arquivo: novoArquivo.nomeArquivo,
            mime_type: dadosArquivo?.mime ?? null,
            tamanho_bytes: dadosArquivo?.tamanho ?? null,
            video_url: null,
          }
        : usarLink
          ? {
              arquivo_path: null,
              nome_arquivo: null,
              mime_type: null,
              tamanho_bytes: null,
              video_url: videoUrl,
            }
          : {}),
    })
    .eq("id", id);
  if (error) {
    if (novoArquivo) await supabase.storage.from(MATERIAIS_BUCKET).remove([novoArquivo.path]);
    throw new Error(`Não foi possível salvar: ${error.message}`);
  }

  // Arquivo antigo só sai depois que o novo foi gravado.
  if (atual.arquivo_path && (novoArquivo || usarLink)) {
    await supabase.storage.from(MATERIAIS_BUCKET).remove([atual.arquivo_path]);
  }

  await registrarLog({
    atorId: admin.id,
    membroId: null,
    acao: "material_editado",
    detalhes: { material_id: id, titulo, arquivo_trocado: !!novoArquivo },
  });
  revalidar();
}

export async function alternarMaterialAtivo(id: string, ativo: boolean) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materiais")
    .update({ ativo })
    .eq("id", id)
    .select("titulo")
    .single();
  if (error) throw new Error(`Não foi possível atualizar: ${error.message}`);

  await registrarLog({
    atorId: admin.id,
    membroId: null,
    acao: "material_editado",
    detalhes: { material_id: id, titulo: data.titulo, ativo },
  });
  revalidar();
}

// Troca a posição com o vizinho dentro da mesma categoria.
export async function moverMaterial(id: string, direcao: "cima" | "baixo") {
  await requireAdmin();
  const supabase = await createClient();

  const { data: atual } = await supabase
    .from("materiais")
    .select("id, categoria, ordem")
    .eq("id", id)
    .single();
  if (!atual) throw new Error("Material não encontrado.");

  const { data: lista } = await supabase
    .from("materiais")
    .select("id, ordem")
    .eq("categoria", atual.categoria)
    .order("ordem")
    .order("created_at");
  const itens = lista ?? [];
  const i = itens.findIndex((m) => m.id === id);
  const j = direcao === "cima" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= itens.length) return;

  // Renumera a categoria inteira (corrige ordens repetidas de quebra).
  const reordenado = [...itens];
  [reordenado[i], reordenado[j]] = [reordenado[j], reordenado[i]];
  for (const [ordem, m] of reordenado.entries()) {
    if (m.ordem === ordem) continue;
    const { error } = await supabase.from("materiais").update({ ordem }).eq("id", m.id);
    if (error) throw new Error(`Não foi possível reordenar: ${error.message}`);
  }
  revalidar();
}

export async function removerMaterial(id: string) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: material } = await supabase
    .from("materiais")
    .select("titulo, arquivo_path")
    .eq("id", id)
    .single();
  if (!material) throw new Error("Material não encontrado.");

  const { error } = await supabase.from("materiais").delete().eq("id", id);
  if (error) throw new Error(`Não foi possível remover: ${error.message}`);

  if (material.arquivo_path) {
    await supabase.storage.from(MATERIAIS_BUCKET).remove([material.arquivo_path]);
  }

  await registrarLog({
    atorId: admin.id,
    membroId: null,
    acao: "material_removido",
    detalhes: { material_id: id, titulo: material.titulo },
  });
  revalidar();
}
