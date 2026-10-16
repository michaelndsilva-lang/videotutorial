"use server";

import { revalidatePath } from "next/cache";
import { requireMembroAprovado } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { normalizarTelefoneBR } from "@/lib/leads/capturar";

const RESERVADOS = new Set(["admin", "membro", "api", "login", "cadastro", "privacidade", "atl", "atlantica"]);

export async function salvarPagina(input: {
  slug: string;
  nome: string;
  bio: string;
  whatsapp: string;
  fotoPath: string | null;
  publicada: boolean;
}) {
  const user = await requireMembroAprovado();
  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) {
    throw new Error("O endereço precisa ter de 3 a 40 letras minúsculas, números ou hífen.");
  }
  if (RESERVADOS.has(slug)) throw new Error("Esse endereço é reservado. Escolha outro.");

  const nome = input.nome.trim().replace(/\s+/g, " ");
  if (nome.length < 2 || nome.length > 80) throw new Error("O nome precisa ter de 2 a 80 caracteres.");

  const bio = input.bio.trim();
  if (bio.length > 400) throw new Error("A apresentação pode ter até 400 caracteres.");

  let whatsapp: string | null = null;
  if (input.whatsapp.trim()) {
    whatsapp = normalizarTelefoneBR(input.whatsapp);
    if (!whatsapp) throw new Error("WhatsApp inválido. Use DDD + número.");
  }

  // A foto precisa estar na pasta do próprio membro (a policy do bucket já
  // garante no upload; aqui evita apontar para a foto de outra pessoa).
  if (input.fotoPath && !input.fotoPath.startsWith(`${user.id}/`)) {
    throw new Error("Foto inválida.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("paginas").upsert({
    membro_id: user.id,
    slug,
    nome_exibicao: nome,
    bio,
    whatsapp,
    foto_path: input.fotoPath,
    publicada: input.publicada,
  });
  if (error) {
    if (error.code === "23505") throw new Error("Esse endereço já está em uso. Escolha outro.");
    throw new Error(`Não foi possível salvar: ${error.message}`);
  }

  revalidatePath("/membro/minha-pagina");
  revalidatePath(`/c/${slug}`);
}
