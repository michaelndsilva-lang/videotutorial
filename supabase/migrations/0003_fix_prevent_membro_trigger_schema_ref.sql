-- A migration anterior (0002) moveu is_admin() para o schema private, mas o corpo desta
-- trigger function ainda chamava public.is_admin() (texto fixo, resolvido em tempo
-- de execução em plpgsql — não é atualizado automaticamente por ALTER FUNCTION SET SCHEMA).
-- Isso fazia todo UPDATE de status (aprovar/recusar/desativar) falhar com
-- "function public.is_admin() does not exist".
create or replace function private.prevent_membro_self_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> old.status and not private.is_admin() then
    raise exception 'apenas o admin pode alterar o status do membro';
  end if;
  return new;
end;
$$;
