import type { ObjetivoConteudo, FormatoConteudo } from "@/lib/types/database.types";

export const OBJETIVO_LABEL: Record<ObjetivoConteudo, string> = {
  recrutamento: "Recrutamento",
  energia_assinatura: "Energia por Assinatura",
  venda_produto: "Venda de Produto",
  autoridade_pessoal: "Autoridade Pessoal",
};

export const FORMATO_LABEL: Record<FormatoConteudo, string> = {
  reels: "Roteiro de Reels",
  legenda_post: "Legenda de Post/Carrossel",
  stories: "Sequência de Stories",
  whatsapp_prospeccao: "Mensagem de Prospecção no WhatsApp",
};
