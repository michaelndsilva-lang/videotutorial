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
  origem: "manual" | "agente_ia";
  observacoes: string | null;
  posicao: number;
};
