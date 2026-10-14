"use server";

import { revalidatePath } from "next/cache";
import { requireMembroAprovado } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { notificarAdmin } from "@/lib/acesso/notificar-admin";
import { avisarPatrocinadorPedidoNovo } from "@/lib/radar/ajuda";
import { CATEGORIA_AJUDA } from "@/lib/radar/radar";
import { nomeDoMembro } from "@/lib/radar/telefone";

export async function abrirPedidoAjuda(categoria: string, mensagem: string) {
  const user = await requireMembroAprovado();
  if (!(categoria in CATEGORIA_AJUDA)) throw new Error("Escolha uma categoria.");
  const texto = mensagem.trim();
  if (!texto || texto.length > 1000) throw new Error("Descreva onde travou (até 1000 caracteres).");

  const supabase = await createClient();
  // Limite simples contra abuso: até 5 pedidos abertos ao mesmo tempo.
  const { count } = await supabase
    .from("pedidos_ajuda")
    .select("id", { count: "exact", head: true })
    .eq("membro_id", user.id)
    .neq("status", "resolvido");
  if ((count ?? 0) >= 5) throw new Error("Você já tem 5 pedidos em aberto. Aguarde o retorno.");

  const { error } = await supabase
    .from("pedidos_ajuda")
    .insert({ membro_id: user.id, categoria, mensagem: texto });
  if (error) throw new Error(`Não foi possível enviar: ${error.message}`);

  const nome = await nomeDoMembro(user.id);
  await Promise.all([
    notificarAdmin(
      `🙋 ATL Prospect: ${nome} pediu ajuda (${CATEGORIA_AJUDA[categoria]}):\n"${texto.slice(0, 300)}"`,
      "/admin/radar"
    ),
    avisarPatrocinadorPedidoNovo(user.id, categoria, texto),
  ]);

  revalidatePath("/membro/ajuda");
}
