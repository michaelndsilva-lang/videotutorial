-- Motor de Conteúdo IA — Fase 3: a tela de geração pede copiar/favoritar/
-- regenerar POR VARIAÇÃO (seção 4 do prompt mestre), não por lote inteiro.
-- Isso só funciona limpo se cada variação for sua própria linha em
-- conteudo_geracoes (com seu próprio favorito) em vez de um array dentro de
-- uma única linha — não havia nenhuma linha gravada ainda (feature nova),
-- então redesenhar agora não migra dado nenhum.
--
-- Substitui a função da 0014: agora recebe um array JSON de variações
-- (p_resultados) e insere uma linha por item, mas debita crédito UMA vez só
-- pra todo o lote — o custo é por chamada de geração, não por variação.
drop function if exists conteudo_registrar_geracao(
  uuid, objetivo_conteudo, formato_conteudo, text, text, jsonb, int, int, text
);

create function conteudo_registrar_geracao(
  p_usuario_id uuid,
  p_objetivo objetivo_conteudo,
  p_formato formato_conteudo,
  p_tema_livre text,
  p_prompt_final text,
  p_resultados jsonb, -- array JSON de variações: [{...}, {...}, ...]
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
    order by ce.created_at desc
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

revoke execute on function conteudo_registrar_geracao(
  uuid, objetivo_conteudo, formato_conteudo, text, text, jsonb, int, int, text
) from anon, authenticated;

-- Permite ao membro alternar o favorito da própria variação diretamente
-- (client normal, sem precisar do service-role pra essa ação de baixo risco).
-- Mas UPDATE por linha não restringe coluna — sem o trigger abaixo, o membro
-- também poderia reescrever prompt_final/resultado da própria geração, o que
-- destruiria a trilha de auditoria de compliance que a seção 7 do prompt
-- mestre pede pro admin. Mesmo padrão já usado em prevent_membro_self_status_change.
create policy conteudo_geracoes_update_favorito on conteudo_geracoes for update
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- Fica em `private` (não `public`), mesmo motivo da 0002: evita virar
-- endpoint RPC público, mas continua funcionando normal como trigger.
create function private.prevent_conteudo_geracao_campo_protegido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if private.is_admin() then
    return new;
  end if;
  if new.objetivo <> old.objetivo
    or new.formato <> old.formato
    or coalesce(new.tema_livre, '') <> coalesce(old.tema_livre, '')
    or new.prompt_final <> old.prompt_final
    or new.resultado is distinct from old.resultado
    or coalesce(new.tokens_consumidos, -1) <> coalesce(old.tokens_consumidos, -1)
    or new.usuario_id <> old.usuario_id
  then
    raise exception 'membro só pode alterar o campo favorito';
  end if;
  return new;
end;
$$;

create trigger before_conteudo_geracao_update
  before update on conteudo_geracoes
  for each row execute function private.prevent_conteudo_geracao_campo_protegido();
