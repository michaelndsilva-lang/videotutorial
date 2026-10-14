"use server";

import { requireMembroAprovado } from "@/lib/auth/guards";
import { perguntarAoMentor, type ResultadoMentor, type TurnoHistorico } from "@/lib/mentor/responder";

export async function perguntar(pergunta: string, historico: TurnoHistorico[]): Promise<ResultadoMentor> {
  const user = await requireMembroAprovado();
  const texto = pergunta.trim();
  if (!texto) throw new Error("Escreva sua pergunta.");
  if (texto.length > 1000) throw new Error("A pergunta pode ter até 1000 caracteres.");

  // O histórico vem do navegador: só os últimos turnos, com tamanho limitado.
  const contexto = (Array.isArray(historico) ? historico : [])
    .slice(-3)
    .map((t) => ({
      pergunta: String(t?.pergunta ?? "").slice(0, 1000),
      resposta: String(t?.resposta ?? "").slice(0, 3000),
    }))
    .filter((t) => t.pergunta && t.resposta);

  return perguntarAoMentor(user.id, texto, contexto);
}
