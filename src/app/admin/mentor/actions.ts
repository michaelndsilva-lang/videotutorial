"use server";

import { revalidatePath } from "next/cache";
import { extractText, getDocumentProxy } from "unpdf";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { processarDocumento } from "@/lib/mentor/base";

const MENTOR_BUCKET = "mentor";
const MAX_CARACTERES = 500_000;

function revalidar() {
  revalidatePath("/admin/mentor");
  revalidatePath("/membro/mentor");
}

export async function salvarConfigMentor(input: {
  ativo: boolean;
  limiteDiario: number;
  promptSistema: string;
}) {
  const admin = await requireAdmin();
  if (!Number.isInteger(input.limiteDiario) || input.limiteDiario < 1 || input.limiteDiario > 500) {
    throw new Error("O limite diário precisa ser um número entre 1 e 500.");
  }
  const prompt = input.promptSistema.trim();
  if (prompt.length > 20000) throw new Error("O prompt pode ter até 20 mil caracteres.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("mentor_config")
    .update({
      ativo: input.ativo,
      limite_diario: input.limiteDiario,
      prompt_sistema: prompt,
      updated_by: admin.id,
    })
    .eq("id", 1);
  if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  revalidar();
}

function validarDocumento(titulo: string, conteudo: string) {
  const t = titulo.trim();
  const c = conteudo.trim();
  if (!t || t.length > 120) throw new Error("O título precisa ter de 1 a 120 caracteres.");
  if (!c) throw new Error("O conteúdo está vazio.");
  if (c.length > MAX_CARACTERES) {
    throw new Error("O conteúdo passou de 500 mil caracteres. Divida em documentos menores.");
  }
  return { titulo: t, conteudo: c };
}

// Cria um documento de texto e já gera os trechos.
export async function criarDocumentoTexto(titulo: string, conteudo: string) {
  const admin = await requireAdmin();
  const dados = validarDocumento(titulo, conteudo);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mentor_documentos")
    .insert({ ...dados, origem: "texto", created_by: admin.id })
    .select("id")
    .single();
  if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  const total = await processarDocumento(data.id);
  revalidar();
  return total;
}

export async function editarDocumento(id: string, titulo: string, conteudo: string) {
  await requireAdmin();
  const dados = validarDocumento(titulo, conteudo);
  const supabase = await createClient();
  const { error } = await supabase
    .from("mentor_documentos")
    .update({ ...dados, status: "pendente" })
    .eq("id", id);
  if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  const total = await processarDocumento(id);
  revalidar();
  return total;
}

// O PDF sobe direto do navegador para o bucket 'mentor' (policy só-admin);
// aqui o servidor extrai o texto, apaga o PDF e processa.
export async function importarPdf(input: { path: string; nomeArquivo: string; titulo: string }) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const descartar = () => supabase.storage.from(MENTOR_BUCKET).remove([input.path]);

  try {
    if (!input.path.startsWith("pdf/")) throw new Error("Arquivo inválido.");
    const { data: arquivo, error } = await supabase.storage.from(MENTOR_BUCKET).download(input.path);
    if (error || !arquivo) throw new Error("Não foi possível ler o PDF enviado.");

    const pdf = await getDocumentProxy(new Uint8Array(await arquivo.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: true });
    const conteudo = (Array.isArray(text) ? text.join("\n\n") : text).trim();
    if (conteudo.length < 50) {
      throw new Error("Não encontrei texto nesse PDF (pode ser só imagem/escaneado).");
    }

    const dados = validarDocumento(input.titulo || input.nomeArquivo.replace(/\.pdf$/i, ""), conteudo);
    const { data, error: insError } = await supabase
      .from("mentor_documentos")
      .insert({ ...dados, origem: "pdf", nome_arquivo: input.nomeArquivo, created_by: admin.id })
      .select("id")
      .single();
    if (insError) throw new Error(`Não foi possível salvar: ${insError.message}`);

    const total = await processarDocumento(data.id);
    revalidar();
    return total;
  } finally {
    await descartar();
  }
}

export async function reprocessarDocumento(id: string) {
  await requireAdmin();
  const total = await processarDocumento(id);
  revalidar();
  return total;
}

export async function alternarDocumentoAtivo(id: string, ativo: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("mentor_documentos").update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

export async function removerDocumento(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("mentor_documentos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}
