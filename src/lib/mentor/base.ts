import "server-only";
import { embed, embedMany } from "ai";
import { createAdminClient } from "@/lib/supabase/admin";

// Embeddings do Mentor: gemini-embedding-001 reduzido a 768 dimensões (igual
// à coluna vector(768) da migration 0033). Escolhido em 2026-10-14: funciona
// no tier gratuito do AI Gateway (os da OpenAI não) e acertou melhor as
// perguntas em português num teste com trechos reais da base.
export const EMBEDDING_MODEL = "google/gemini-embedding-001";
const EMBEDDING_OPCOES = { providerOptions: { google: { outputDimensionality: 768 } } };

const TAMANHO_TRECHO = 1000;

// Divide em trechos de ~1000 caracteres respeitando parágrafos; parágrafo
// gigante (comum em PDF) é cortado por frases. O último parágrafo de um
// trecho se repete no começo do próximo quando é curto, para não perder
// contexto na fronteira.
export function dividirEmTrechos(texto: string): string[] {
  const paragrafos = texto
    .replace(/\r/g, "")
    .split(/\n\s*\n|\n(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 ]{6,}\n)/)
    .flatMap((p) => {
      const limpo = p.replace(/[ \t]+/g, " ").trim();
      if (limpo.length <= TAMANHO_TRECHO) return limpo ? [limpo] : [];
      const frases = limpo.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) ?? [limpo];
      const partes: string[] = [];
      let atual = "";
      for (const f of frases) {
        if ((atual + f).length > TAMANHO_TRECHO && atual) {
          partes.push(atual.trim());
          atual = "";
        }
        atual += f;
      }
      if (atual.trim()) partes.push(atual.trim());
      return partes;
    });

  const trechos: string[] = [];
  let atual: string[] = [];
  let tamanho = 0;
  for (const p of paragrafos) {
    if (tamanho + p.length > TAMANHO_TRECHO && atual.length) {
      trechos.push(atual.join("\n\n"));
      const ultimo = atual[atual.length - 1];
      atual = ultimo.length < 300 ? [ultimo] : [];
      tamanho = atual.reduce((t, x) => t + x.length, 0);
    }
    atual.push(p);
    tamanho += p.length;
  }
  if (atual.length) trechos.push(atual.join("\n\n"));
  return trechos;
}

export async function embeddingDaPergunta(texto: string): Promise<number[]> {
  const { embedding } = await embed({ model: EMBEDDING_MODEL, value: texto, ...EMBEDDING_OPCOES });
  return embedding;
}

// pgvector aceita o vetor como texto "[0.1,0.2,...]".
export function vetorParaTexto(v: number[]) {
  return `[${v.join(",")}]`;
}

// Gera (ou regera) os trechos e embeddings de um documento. Roda com
// service-role: é chamado depois que a action já conferiu que é o admin.
export async function processarDocumento(documentoId: string) {
  const admin = createAdminClient();
  const { data: doc, error } = await admin
    .from("mentor_documentos")
    .select("id, titulo, conteudo")
    .eq("id", documentoId)
    .single();
  if (error || !doc) throw new Error("Documento não encontrado.");

  try {
    // O título entra no texto de cada trecho: ajuda a busca a achar o
    // documento certo quando a pergunta cita o assunto pelo nome.
    const trechos = dividirEmTrechos(doc.conteudo);
    if (trechos.length === 0) throw new Error("O documento não tem texto para processar.");
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: trechos.map((t) => `${doc.titulo}\n\n${t}`),
      ...EMBEDDING_OPCOES,
    });

    const { error: delError } = await admin.from("mentor_trechos").delete().eq("documento_id", doc.id);
    if (delError) throw delError;

    const linhas = trechos.map((conteudo, ordem) => ({
      documento_id: doc.id,
      ordem,
      conteudo,
      embedding: vetorParaTexto(embeddings[ordem]),
    }));
    for (let i = 0; i < linhas.length; i += 100) {
      const { error: insError } = await admin.from("mentor_trechos").insert(linhas.slice(i, i + 100));
      if (insError) throw insError;
    }

    await admin
      .from("mentor_documentos")
      .update({ status: "pronto", erro: null, total_trechos: trechos.length })
      .eq("id", doc.id);
    return trechos.length;
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    await admin
      .from("mentor_documentos")
      .update({ status: "erro", erro: mensagem.slice(0, 500) })
      .eq("id", doc.id);
    throw new Error(`Falha ao processar: ${mensagem}`);
  }
}
