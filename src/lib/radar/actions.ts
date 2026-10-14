"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { avisarMembroSobrePedido } from "./ajuda";

const STATUS = ["aberto", "em_atendimento", "resolvido"] as const;

// Usada pelo admin (/admin/radar) e por quem está acima na linha
// (/membro/equipe). Quem pode atender é decidido pela policy de update de
// pedidos_ajuda (admin ou ancestral do membro, aprovado).
export async function atualizarPedidoAjuda(id: string, status: string, resposta: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Faça login novamente.");
  if (!STATUS.includes(status as (typeof STATUS)[number])) throw new Error("Status inválido.");
  const texto = resposta.trim();
  if (texto.length > 1000) throw new Error("A resposta pode ter até 1000 caracteres.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedidos_ajuda")
    .update({ status, resposta: texto || null, atendido_por: user.id })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  if (!data?.length) throw new Error("Você não pode atender este pedido.");

  await avisarMembroSobrePedido(id);
  revalidatePath("/admin/radar");
  revalidatePath("/membro/equipe");
  revalidatePath("/membro/ajuda");
}
