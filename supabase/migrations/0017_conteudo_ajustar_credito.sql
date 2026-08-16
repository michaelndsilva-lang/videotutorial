-- Motor de Conteúdo IA — Fase 5: admin ajusta crédito de um membro (adicionar,
-- zerar, ajuste em massa — seção 7 do prompt mestre). Mesmo padrão de lock da
-- conteudo_registrar_geracao: lê o último saldo_apos com
-- pg_advisory_xact_lock, grava o novo lançamento tipo 'ajuste_admin'.
create function conteudo_ajustar_credito(
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
  order by ce.created_at desc
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

revoke execute on function conteudo_ajustar_credito(uuid, int) from public, anon, authenticated;
