-- Bug real encontrado em teste: conteudo_registrar_geracao e
-- conteudo_ajustar_credito buscavam "o último saldo" com
-- `order by created_at desc limit 1`. Dentro de uma função plpgsql, now()
-- é fixo no início da TRANSAÇÃO (não avança entre INSERTs sequenciais no
-- mesmo bloco) — então a recarga inicial e o primeiro consumo de um membro
-- novo sempre saem com o MESMO created_at, e o desempate entre linhas
-- empatadas não é determinístico. Reproduzido em produção: uma regeneração
-- leu o saldo da recarga (30) em vez do consumo mais recente (29), gravando
-- saldo_apos errado.
--
-- Corrige com uma coluna de sequência monotônica de verdade (bigserial),
-- que cresce na ordem de INSERT independente de timestamp, e troca a
-- ordenação nas duas funções pra usar essa coluna.
alter table creditos_extrato add column seq bigserial;
create index creditos_extrato_usuario_seq_idx on creditos_extrato (usuario_id, seq desc);

-- Mesma causa raiz vale pra conteudo_geracoes: as 3 variações de um mesmo
-- lote são inseridas na mesma transação (mesmo created_at), então a ordem de
-- exibição na Biblioteca/Auditoria entre elas não era determinística.
alter table conteudo_geracoes add column seq bigserial;
create index conteudo_geracoes_usuario_seq_idx on conteudo_geracoes (usuario_id, seq desc);

create or replace function conteudo_registrar_geracao(
  p_usuario_id uuid,
  p_objetivo objetivo_conteudo,
  p_formato formato_conteudo,
  p_tema_livre text,
  p_prompt_final text,
  p_resultados jsonb,
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
  v_saldo int;
  v_resultado jsonb;
  v_id uuid;
  v_ids uuid[] := '{}';
  v_primeiro_id uuid;
begin
  if p_modo_credito <> 'ilimitado' then
    perform pg_advisory_xact_lock(hashtext(p_usuario_id::text));

    select ce.saldo_apos into v_saldo
    from creditos_extrato ce
    where ce.usuario_id = p_usuario_id
    order by ce.seq desc
    limit 1;

    if v_saldo is null then
      select cg.creditos_mensais_padrao into v_saldo from configuracoes_gerais cg limit 1;
      insert into creditos_extrato (usuario_id, tipo, quantidade, saldo_apos)
      values (p_usuario_id, 'recarga', v_saldo, v_saldo);
    end if;

    if v_saldo < p_custo then
      raise exception 'creditos_insuficientes';
    end if;
  end if;

  for v_resultado in select jsonb_array_elements(p_resultados) loop
    insert into conteudo_geracoes
      (usuario_id, objetivo, formato, tema_livre, prompt_final, resultado, tokens_consumidos)
    values
      (p_usuario_id, p_objetivo, p_formato, p_tema_livre, p_prompt_final, v_resultado, p_tokens_consumidos)
    returning id into v_id;

    v_ids := array_append(v_ids, v_id);
  end loop;

  v_primeiro_id := v_ids[1];

  if p_modo_credito <> 'ilimitado' then
    v_saldo := v_saldo - p_custo;
    insert into creditos_extrato (usuario_id, tipo, quantidade, saldo_apos, referencia_id)
    values (p_usuario_id, 'consumo', -p_custo, v_saldo, v_primeiro_id);
  end if;

  return query select unnest(v_ids), v_saldo;
end;
$$;

create or replace function conteudo_ajustar_credito(
  p_usuario_id uuid,
  p_novo_saldo int
)
returns table (saldo_apos int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saldo_atual int;
  v_delta int;
begin
  if not private.is_admin() then
    raise exception 'apenas admin pode ajustar créditos';
  end if;

  if p_novo_saldo < 0 then
    raise exception 'saldo não pode ser negativo';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_usuario_id::text));

  select ce.saldo_apos into v_saldo_atual
  from creditos_extrato ce
  where ce.usuario_id = p_usuario_id
  order by ce.seq desc
  limit 1;

  v_saldo_atual := coalesce(v_saldo_atual, 0);
  v_delta := p_novo_saldo - v_saldo_atual;

  if v_delta = 0 then
    return query select v_saldo_atual;
    return;
  end if;

  insert into creditos_extrato (usuario_id, tipo, quantidade, saldo_apos)
  values (p_usuario_id, 'ajuste_admin', v_delta, p_novo_saldo);

  return query select p_novo_saldo;
end;
$$;
