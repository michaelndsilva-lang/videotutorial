-- Bug real encontrado em teste: conteudo_ajustar_credito checava
-- private.is_admin() internamente, mas auth.uid() é NULL quando chamada via
-- client service-role (sem JWT de usuário associado à conexão) — então a
-- checagem sempre falhava com "apenas admin pode ajustar créditos", mesmo
-- vindo de uma server action que já validou requireAdmin() em código. A
-- proteção real já está no GRANT (revoke de anon/authenticated na 0017) —
-- só service_role/postgres executam esta função, e quem usa o client
-- service-role já é código server-side que checou admin antes. Mesmo
-- padrão de conteudo_registrar_geracao, que não reverifica "é membro"
-- internamente pelo mesmo motivo.
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
