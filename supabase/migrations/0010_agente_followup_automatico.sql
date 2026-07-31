-- Suporte ao envio automático de follow-up para leads que pararam de
-- responder por 3+ horas (cron em /api/cron/followup).

-- Marca mensagens de follow-up enviadas automaticamente, para diferenciá-las
-- de respostas normais do agente e evitar reenvio repetido enquanto o lead
-- continuar em silêncio.
alter table agente_mensagens
  add column is_followup boolean not null default false;

-- Retorna, para cada conversa (membro_id + telefone_lead), os casos em que a
-- última mensagem foi do agente, ainda não gerou follow-up, e já passou de
-- 3 horas — candidatos ao envio automático.
create or replace function public.agente_conversas_aguardando_followup()
returns table (
  membro_id uuid,
  telefone_lead text,
  ultima_mensagem_em timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select membro_id, telefone_lead, created_at as ultima_mensagem_em
  from (
    select distinct on (membro_id, telefone_lead)
      membro_id, telefone_lead, remetente, is_followup, created_at
    from agente_mensagens
    order by membro_id, telefone_lead, created_at desc
  ) ultima
  where remetente = 'agente'
    and is_followup = false
    and created_at < now() - interval '3 hours'
$$;

-- Função é security definer (precisa ler agente_mensagens de todos os membros
-- de uma vez); só o cron (via service-role) pode chamá-la.
revoke execute on function public.agente_conversas_aguardando_followup() from public;
grant execute on function public.agente_conversas_aguardando_followup() to service_role;
