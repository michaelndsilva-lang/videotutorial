-- Fase 4: agente de IA no WhatsApp (Evolution API).
-- Histórico de conversas por lead (para dar contexto ao agente) e o necessário
-- para o webhook (service-role) e os server actions do membro (RLS) escreverem
-- em whatsapp_sessions.

-- ============================================================================
-- AGENTE_MENSAGENS (histórico de conversa lead <-> agente, por membro+telefone)
-- ============================================================================
create type mensagem_remetente as enum ('lead', 'agente');

create table agente_mensagens (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references membros(usuario_id) on delete cascade,
  telefone_lead text not null,
  remetente mensagem_remetente not null,
  conteudo text not null,
  created_at timestamptz not null default now()
);
alter table agente_mensagens enable row level security;

-- Só leitura para o próprio membro/admin. Escrita é feita pelo webhook
-- (service-role), no mesmo padrão de whatsapp_sessions (ver 0001).
create policy agente_mensagens_select on agente_mensagens for select
  using (membro_id = auth.uid() or private.is_admin());

create index idx_agente_mensagens_conversa
  on agente_mensagens (membro_id, telefone_lead, created_at);

-- ============================================================================
-- WHATSAPP_SESSIONS: suporte a lookup por instance_name (webhook) e escrita
-- direta pelo próprio membro (conectar/desconectar via RLS, sem service-role).
-- ============================================================================
alter table whatsapp_sessions
  add constraint whatsapp_sessions_instance_name_key unique (instance_name);

create policy whatsapp_sessions_update_self on whatsapp_sessions for update
  using (membro_id = auth.uid() or private.is_admin())
  with check (membro_id = auth.uid() or private.is_admin());

-- Necessário para a UI assinar mudanças de status/QR em tempo real.
alter publication supabase_realtime add table whatsapp_sessions;
