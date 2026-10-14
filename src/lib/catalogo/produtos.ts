// Usado no navegador e no servidor.

export const PRODUTOS_BUCKET = "produtos";
export const IMAGEM_PRODUTO_MAX = 5 * 1024 * 1024;
export const MAX_IMAGENS = 6;

export function urlImagemProduto(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PRODUTOS_BUCKET}/${path}`;
}

export function precoBRL(valor: number | null | undefined) {
  if (valor == null) return null;
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type ProdutoResumo = {
  id: string;
  nome: string;
  descricaoCurta: string;
  categoria: string;
  capa: string | null;
  destaque: boolean;
  preco: number | null;
};
