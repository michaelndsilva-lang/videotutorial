-- Motor de Conteúdo IA — Fase 2: função que registra uma geração e debita
-- crédito de forma atômica. Uma única chamada RPC = uma única transação
-- implícita do Postgres: se o saldo for insuficiente, a exceção aborta tudo
-- (nem a geração nem o débito ficam gravados). O client service-role chama
-- isto DEPOIS de já ter a resposta da IA validada — nunca antes, porque
-- geração com JSON inválido não deve debitar nem ficar registrada.
create or replace function conteudo_registrar_geracao(
  p_usuario_id uuid,
  p_objetivo objetivo_conteudo,
  p_formato formato_conteudo,
  p_tema_livre text,
  p_prompt_final text,
  p_resultado jsonb,
  p_tokens_consumidos int,
  p_custo int,
  p_modo_credito text
)
returns table (geracao_id uuid, saldo_apos int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_geracao_id uuid;
  v_saldo int;
begin
  if p_modo_credito <> 'ilimitado' then
    -- Lock por usuário (não por linha, já que o "saldo atual" é derivado do
    -- último lançamento do ledger) — evita duas gerações concorrentes do
    -- mesmo membro lerem o mesmo saldo e ambas passarem no cheque.
    perform pg_advisory_xact_lock(hashtext(p_usuario_id::text));

    select ce.saldo_apos into v_saldo
    from creditos_extrato ce
    where ce.usuario_id = p_usuario_id
    order by ce.created_at desc
    limit 1;

    if v_saldo is null then
      -- Primeira geração deste membro: concede o crédito mensal padrão antes
      -- de debitar. Não há cron de recarga mensal ainda (fica pra quando o
      -- modelo de cobrança for decidido) — isto só cobre o saldo inicial.
      select cg.creditos_mensais_padrao into v_saldo from configuracoes_gerais cg limit 1;
      insert into creditos_extrato (usuario_id, tipo, quantidade, saldo_apos)
      values (p_usuario_id, 'recarga', v_saldo, v_saldo);
    end if;

    if v_saldo < p_custo then
      raise exception 'creditos_insuficientes';
    end if;
  end if;

  insert into conteudo_geracoes
    (usuario_id, objetivo, formato, tema_livre, prompt_final, resultado, tokens_consumidos)
  values
    (p_usuario_id, p_objetivo, p_formato, p_tema_livre, p_prompt_final, p_resultado, p_tokens_consumidos)
  returning id into v_geracao_id;

  if p_modo_credito <> 'ilimitado' then
    v_saldo := v_saldo - p_custo;
    insert into creditos_extrato (usuario_id, tipo, quantidade, saldo_apos, referencia_id)
    values (p_usuario_id, 'consumo', -p_custo, v_saldo, v_geracao_id);
  end if;

  return query select v_geracao_id, v_saldo;
end;
$$;

-- Só o client service-role (server actions já autenticadas) chama isto.
revoke execute on function conteudo_registrar_geracao(
  uuid, objetivo_conteudo, formato_conteudo, text, text, jsonb, int, int, text
) from anon, authenticated;
