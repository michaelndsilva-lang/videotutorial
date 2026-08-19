-- Estado do funil de energia por lead (conta de luz -> análise humana -> RG/CNH
-- -> e-mail -> contrato). O webhook (service-role) usa essa tabela pra saber em
-- que etapa cada conversa está e pausar o agente enquanto aguarda análise
-- manual do membro. Só é usada quando modo_agente_ativo = 'energia'.

create table energia_leads (
  membro_id uuid not null references membros(usuario_id) on delete cascade,
  telefone_lead text not null,
  etapa text not null default 'aguardando_conta'
    check (etapa in ('aguardando_conta', 'aguardando_analise', 'aguardando_documento', 'aguardando_email', 'concluido')),
  updated_at timestamptz not null default now(),
  primary key (membro_id, telefone_lead)
);
alter table energia_leads enable row level security;

-- Só leitura para o próprio membro/admin. Escrita é feita pelo webhook
-- (service-role), no mesmo padrão de agente_mensagens (ver 0006).
create policy energia_leads_select on energia_leads for select
  using (membro_id = auth.uid() or private.is_admin());
