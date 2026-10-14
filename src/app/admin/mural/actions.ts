"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { localParaIso } from "@/lib/mural/agenda";

function revalidar() {
  revalidatePath("/admin/mural");
  revalidatePath("/membro/mural");
  revalidatePath("/membro/dashboard");
}

export async function salvarAviso(input: {
  id?: string;
  titulo: string;
  texto: string;
  fixado: boolean;
  ativo: boolean;
  expiraEm: string;
}) {
  const admin = await requireAdmin();
  const titulo = input.titulo.trim();
  const texto = input.texto.trim();
  if (!titulo || titulo.length > 120) throw new Error("O título precisa ter de 1 a 120 caracteres.");
  if (texto.length > 2000) throw new Error("O texto pode ter até 2000 caracteres.");
  const expiraEm = input.expiraEm ? localParaIso(input.expiraEm) : null;
  if (input.expiraEm && !expiraEm) throw new Error("Data de expiração inválida.");

  const supabase = await createClient();
  const dados = { titulo, texto, fixado: input.fixado, ativo: input.ativo, expira_em: expiraEm };
  const { error } = input.id
    ? await supabase.from("avisos").update(dados).eq("id", input.id)
    : await supabase.from("avisos").insert({ ...dados, created_by: admin.id });
  if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  revalidar();
}

export async function removerAviso(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("avisos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

export async function salvarEvento(input: {
  id?: string;
  titulo: string;
  descricao: string;
  inicio: string;
  duracaoMin: number;
  link: string;
  ativo: boolean;
}) {
  const admin = await requireAdmin();
  const titulo = input.titulo.trim();
  const descricao = input.descricao.trim();
  const link = input.link.trim() || null;
  const inicio = localParaIso(input.inicio);
  if (!titulo || titulo.length > 120) throw new Error("O título precisa ter de 1 a 120 caracteres.");
  if (descricao.length > 2000) throw new Error("A descrição pode ter até 2000 caracteres.");
  if (!inicio) throw new Error("Informe data e hora do evento.");
  if (!Number.isInteger(input.duracaoMin) || input.duracaoMin < 5 || input.duracaoMin > 600) {
    throw new Error("Duração entre 5 e 600 minutos.");
  }
  if (link && !/^https:\/\/\S+$/i.test(link)) throw new Error("O link precisa começar com https://");

  const supabase = await createClient();
  const dados = { titulo, descricao, inicio, duracao_min: input.duracaoMin, link, ativo: input.ativo };
  if (input.id) {
    // Mudou o horário: o lembrete volta a valer para o novo horário.
    const { data: atual } = await supabase.from("eventos").select("inicio").eq("id", input.id).single();
    const reagendado = atual && new Date(atual.inicio).getTime() !== new Date(inicio).getTime();
    const { error } = await supabase
      .from("eventos")
      .update(reagendado ? { ...dados, lembrete_enviado_em: null } : dados)
      .eq("id", input.id);
    if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  } else {
    const { error } = await supabase.from("eventos").insert({ ...dados, created_by: admin.id });
    if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  }
  revalidar();
}

export async function removerEvento(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("eventos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

export async function moderarConquista(id: string, acao: "ocultar" | "mostrar" | "remover") {
  await requireAdmin();
  const supabase = await createClient();
  const { error } =
    acao === "remover"
      ? await supabase.from("conquistas").delete().eq("id", id)
      : await supabase.from("conquistas").update({ oculta: acao === "ocultar" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}
