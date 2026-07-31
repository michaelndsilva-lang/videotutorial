-- Move funções internas (helpers de RLS e triggers) para fora do schema `public`,
-- que é o schema exposto pelo PostgREST. Isso evita que virem endpoints RPC públicos
-- (/rest/v1/rpc/...), sem quebrar seu uso dentro de policies/triggers (que resolvem
-- por OID, não por nome, na hora da execução).
create schema if not exists private;
grant usage on schema private to anon, authenticated;

alter function public.is_admin() set schema private;
alter function public.handle_new_user() set schema private;
alter function public.handle_new_membro() set schema private;
alter function public.prevent_membro_self_status_change() set schema private;
alter function public.set_updated_at() set schema private;

-- corrige o aviso de search_path mutável
alter function private.set_updated_at() set search_path = public;
