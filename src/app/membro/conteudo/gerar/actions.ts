"use server";

import { requireMembro } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { gerarConteudoIA, resolverPromptTemplate } from "@/lib/ai/motor-conteudo";
import type { ObjetivoConteudo, FormatoConteudo, Json } from "@/lib/types/database.types";

export type GerarConteudoInput = {
  objetivo: ObjetivoConteudo;
  formato: FormatoConteudo;
  temaLivre?: string;
  // 1 quando é regeneração de uma única variação (ver seção 4 do prompt
  // mestre: "regenerar apenas aquela variação"). 3 = geração normal.
  quantidade?: number;
};

export type VariacaoGerada = { geracaoId: string; resultado: unknown };

export type GerarConteudoResultado =
  | { sucesso: true; variacoes: VariacaoGerada[]; saldoApos: number | null }
  | { sucesso: false; erro: string };

// Escrita real (insert das variações + débito de crédito) só acontece dentro
// de conteudo_registrar_geracao (migration 0015), chamada DEPOIS da IA já
// ter respondido com sucesso — geração inválida não deve debitar nem ficar
// registrada (seção 5 do prompt mestre).
export async function gerarConteudo(input: GerarConteudoInput): Promise<GerarConteudoResultado> {
  const user = await requireMembro();
  const admin = createAdminClient();
  const quantidade = input.quantidade ?? 3;

  const { data: perfil } = await admin
    .from("perfil_conteudo")
    .select("nome_exibicao, cidade, publico_alvo, tom_de_voz, nivel_experiencia, onboarding_completo")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!perfil?.onboarding_completo) {
    return { sucesso: false, erro: "Complete seu perfil em 1 minuto e libere o motor." };
  }

  const { data: config } = await admin
    .from("configuracoes_gerais")
    .select("modo_credito, custo_por_geracao, creditos_mensais_padrao, modelo_ia_conteudo")
    .limit(1)
    .single();

  if (!config) {
    return { sucesso: false, erro: "Configuração da plataforma não encontrada." };
  }

  // Cheque rápido (não atômico) só pra não gastar uma chamada de IA à toa
  // quando já dá pra saber que não há saldo. A validação que realmente vale
  // — com lock contra corridas concorrentes — é a de dentro do RPC abaixo.
  if (config.modo_credito !== "ilimitado") {
    const { data: ultimoLancamento } = await admin
      .from("creditos_extrato")
      .select("saldo_apos")
      .eq("usuario_id", user.id)
      // seq, não created_at: dois lançamentos da mesma transação (ex. a
      // recarga inicial + o primeiro consumo) saem com timestamp idêntico
      // (now() é fixo por transação em plpgsql) — só uma coluna monotônica
      // de verdade garante pegar o mais recente. Bug real encontrado em
      // teste: um saldo_apos ficou gravado errado por causa disso.
      .order("seq", { ascending: false })
      .limit(1)
      .maybeSingle();

    const saldoAtual = ultimoLancamento?.saldo_apos ?? config.creditos_mensais_padrao;
    if (saldoAtual < config.custo_por_geracao) {
      return { sucesso: false, erro: "Créditos insuficientes." };
    }
  }

  const { data: template } = await admin
    .from("conteudo_prompt_templates")
    .select("system_prompt")
    .eq("objetivo", input.objetivo)
    .eq("formato", input.formato)
    .eq("ativo", true)
    .maybeSingle();

  if (!template) {
    return { sucesso: false, erro: "Nenhum template ativo para esta combinação. Fale com o admin." };
  }

  const promptFinal = resolverPromptTemplate(template.system_prompt, {
    nome_exibicao: perfil.nome_exibicao,
    cidade: perfil.cidade,
    publico_alvo: perfil.publico_alvo,
    tom_de_voz: perfil.tom_de_voz,
    nivel_experiencia: perfil.nivel_experiencia,
    tema_livre: input.temaLivre,
  });

  let variacoesIA: unknown[];
  let tokensConsumidos: number;
  try {
    const geracao = await gerarConteudoIA({
      systemPrompt: promptFinal,
      formato: input.formato,
      modelo: config.modelo_ia_conteudo,
      quantidade,
    });
    variacoesIA = geracao.resultado.variacoes;
    tokensConsumidos = geracao.tokensConsumidos;
  } catch (err) {
    console.error("Falha ao gerar conteúdo:", err);
    return { sucesso: false, erro: "Não conseguimos gerar agora. Tente de novo em instantes." };
  }

  const { data: registros, error } = await admin.rpc("conteudo_registrar_geracao", {
    p_usuario_id: user.id,
    p_objetivo: input.objetivo,
    p_formato: input.formato,
    p_tema_livre: input.temaLivre?.trim() ?? "",
    p_prompt_final: promptFinal,
    p_resultados: variacoesIA as Json,
    p_tokens_consumidos: tokensConsumidos,
    p_custo: config.custo_por_geracao,
    p_modo_credito: config.modo_credito,
  });

  if (error || !registros?.length) {
    if (error?.message.includes("creditos_insuficientes")) {
      return { sucesso: false, erro: "Créditos insuficientes." };
    }
    console.error("Falha ao registrar geração:", error);
    return { sucesso: false, erro: "Conteúdo gerado, mas não foi possível salvar. Tente de novo." };
  }

  return {
    sucesso: true,
    variacoes: registros.map((registro, i) => ({
      geracaoId: registro.geracao_id,
      resultado: variacoesIA[i],
    })),
    saldoApos: registros[0].saldo_apos,
  };
}
