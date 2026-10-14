import type { TipoTarefa } from "@/lib/types/database.types";

// Mesma regra de private.trilha_dia_liberado (migration 0031): um dia libera
// quando todas as missões ativas dos dias anteriores estão concluídas. Dia sem
// missão ativa não trava nada.

export const TOTAL_DIAS = 7;

export const TIPO_TAREFA_LABEL: Record<TipoTarefa, string> = {
  assistir: "Assistir",
  executar: "Executar",
  responder: "Responder",
};

export type MissaoBase = { id: string; dia: number; ordem: number };

export type DiaTrilha<M extends MissaoBase> = {
  dia: number;
  missoes: M[];
  concluidas: number;
  liberado: boolean;
  completo: boolean;
};

export function montarTrilha<M extends MissaoBase>(missoes: M[], concluidas: Set<string>) {
  const dias: DiaTrilha<M>[] = [];
  let anterioresCompletos = true;
  for (let dia = 1; dia <= TOTAL_DIAS; dia++) {
    const doDia = missoes.filter((m) => m.dia === dia).sort((a, b) => a.ordem - b.ordem);
    const feitas = doDia.filter((m) => concluidas.has(m.id)).length;
    const completo = feitas === doDia.length;
    dias.push({ dia, missoes: doDia, concluidas: feitas, liberado: anterioresCompletos, completo });
    anterioresCompletos = anterioresCompletos && completo;
  }

  const total = missoes.length;
  const feitas = missoes.filter((m) => concluidas.has(m.id)).length;
  const comMissao = dias.filter((d) => d.missoes.length > 0);
  // Dia atual = primeiro dia liberado e incompleto (ou o último, se acabou tudo).
  const diaAtual =
    comMissao.find((d) => d.liberado && !d.completo)?.dia ?? comMissao.at(-1)?.dia ?? 1;

  return {
    dias,
    total,
    feitas,
    percentual: total ? Math.round((feitas / total) * 100) : 0,
    concluida: total > 0 && feitas === total,
    diaAtual,
  };
}
