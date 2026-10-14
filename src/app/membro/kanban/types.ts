import type { CardOrigem } from "@/lib/types/database.types";

export type ColumnRow = {
  id: string;
  board_id: string;
  nome: string;
  posicao: number;
  is_padrao: boolean;
};

export type CardRow = {
  id: string;
  board_id: string;
  coluna_id: string;
  nome_lead: string;
  telefone: string | null;
  origem: CardOrigem;
  observacoes: string | null;
  posicao: number;
  proximo_followup: string | null;
  movido_em: string;
};
