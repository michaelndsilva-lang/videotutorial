-- Fase 0 (controle de acesso), travas 1 e 2:
--   1. membro só usa a plataforma depois de aprovado (membros.status = 'ativo');
--   2. membro aprovado só usa o robô de WhatsApp depois que o admin libera
--      individualmente (robo_acesso.status = 'liberado').
-- Toda aprovação/recusa/liberação/revogação vai para access_logs (gravado pelo
-- servidor com service-role; ver src/lib/acesso/log.ts).

-- ============================================================================
-- MEMBROS: quem aprovou, quando e motivo da última mudança de status
-- ============================================================================
alter table membros
  add column aprovado_por uuid references usuarios(id) on delete set null,
  add column aprovado_em timestamptz,
  add column motivo_status text;

-- 'inativo' é legado: vira 'suspenso' (mesmo efeito, nome do roadmap).
update membros set status = 'suspenso' where status = 'inativo';

-- Membros já aprovados antes desta migration: registra a data do cadastro
-- como aprovação, para o painel não mostrar campo vazio.
update membros set aprovado_em = created_at where status = 'ativo' and aprovado_em is null;

create function private.registrar_aprovacao_membro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'ativo' and old.status is distinct from 'ativo' then
    new.aprovado_em := now();
    new.aprovado_por := coalesce(auth.uid(), new.aprovado_por);
  end if;
  return new;
end;
$$;

create trigger before_membro_update_aprovacao
  before update of status on membros
  for each row execute function private.registrar_aprovacao_membro();

-- ============================================================================
-- ROBO_ACESSO (1:1 por membro)
-- ============================================================================
create type robo_status as enum ('sem_acesso', 'solicitado', 'liberado', 'revogado');

create table robo_acesso (
  membro_id uuid primary key references membros(usuario_id) on delete cascade,
  status robo_status not null default 'sem_acesso',
  -- 'sunne' tem gate próprio (membros.sunne_habilitado), não entra aqui.
  modos_permitidos agente_modo[] not null default array['recrutamento', 'energia']::agente_modo[],
  limite_diario_mensagens int not null default 50,
  termo_aceito_em timestamptz,
  solicitado_em timestamptz,
  liberado_por uuid references usuarios(id) on delete set null,
  liberado_em timestamptz,
  motivo_revogacao text,
  updated_at timestamptz not null default now(),
  constraint robo_acesso_modos_validos check (
    cardinality(modos_permitidos) >= 1
    and modos_permitidos <@ array['recrutamento', 'energia']::agente_modo[]
  ),
  constraint robo_acesso_limite_valido check (limite_diario_mensagens between 1 and 1000)
);
alter table robo_acesso enable row level security;

create policy robo_acesso_select on robo_acesso for select
  using (membro_id = auth.uid() or private.is_admin());

-- O membro só consegue fazer a transição 'sem_acesso' -> 'solicitado' (o
-- trigger abaixo barra o resto). Inserção só via trigger/service-role.
create policy robo_acesso_update on robo_acesso for update
  using (membro_id = auth.uid() or private.is_admin())
  with check (membro_id = auth.uid() or private.is_admin());

create function private.proteger_robo_acesso()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membro_status membro_status;
begin
  if new.membro_id is distinct from old.membro_id then
    raise exception 'membro_id não pode ser alterado';
  end if;

  select status into v_membro_status from membros where usuario_id = new.membro_id;

  -- Sem usuário = SQL direto / service-role; admin pode tudo.
  if auth.uid() is null or private.is_admin() then
    if new.status = 'liberado' and v_membro_status is distinct from 'ativo' then
      raise exception 'o robô só pode ser liberado para membro aprovado';
    end if;
    if new.status = 'liberado' and old.status is distinct from 'liberado' then
      new.liberado_em := now();
      new.liberado_por := coalesce(auth.uid(), new.liberado_por);
      new.motivo_revogacao := null;
    end if;
    new.updated_at := now();
    return new;
  end if;

  -- Membro comum: só pode pedir acesso, uma vez, aceitando o termo.
  if new.membro_id <> auth.uid() then
    raise exception 'sem permissão';
  end if;
  if v_membro_status is distinct from 'ativo' then
    raise exception 'seu cadastro ainda não foi aprovado';
  end if;
  if not (old.status = 'sem_acesso' and new.status = 'solicitado') then
    raise exception 'apenas o admin pode alterar o acesso ao robô';
  end if;
  if new.termo_aceito_em is null then
    raise exception 'é preciso aceitar o termo de ciência antes de solicitar';
  end if;
  if new.modos_permitidos is distinct from old.modos_permitidos
     or new.limite_diario_mensagens is distinct from old.limite_diario_mensagens
     or new.liberado_por is distinct from old.liberado_por
     or new.liberado_em is distinct from old.liberado_em
     or new.motivo_revogacao is distinct from old.motivo_revogacao then
    raise exception 'apenas o admin pode alterar o acesso ao robô';
  end if;

  -- Datas sempre do servidor, nunca do cliente.
  new.termo_aceito_em := now();
  new.solicitado_em := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger before_robo_acesso_update
  before update on robo_acesso
  for each row execute function private.proteger_robo_acesso();

-- Membro suspenso/recusado perde o robô automaticamente. A desconexão da
-- instância na Evolution é feita pelo app (server action do admin), já que o
-- banco não chama a API externa.
create function private.revogar_robo_ao_bloquear_membro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('suspenso', 'recusado', 'inativo') and old.status is distinct from new.status then
    update robo_acesso
       set status = 'revogado',
           motivo_revogacao = 'Membro ' || new.status::text
     where membro_id = new.usuario_id
       and status in ('solicitado', 'liberado');
  end if;
  return new;
end;
$$;

create trigger after_membro_update_revoga_robo
  after update of status on membros
  for each row execute function private.revogar_robo_ao_bloquear_membro();

-- Todo membro novo nasce com a linha 'sem_acesso'.
create or replace function private.handle_new_membro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_board_recrutamento_id uuid;
  v_board_energia_id uuid;
begin
  insert into public.kanban_boards (membro_id, modo) values (new.usuario_id, 'recrutamento')
  returning id into v_board_recrutamento_id;

  insert into public.kanban_columns (board_id, nome, posicao, is_padrao) values
    (v_board_recrutamento_id, 'Novo Lead', 1, true),
    (v_board_recrutamento_id, 'Em Conversa', 2, true),
    (v_board_recrutamento_id, 'Qualificado', 3, true),
    (v_board_recrutamento_id, 'Fechado', 4, true);

  insert into public.kanban_boards (membro_id, modo) values (new.usuario_id, 'energia')
  returning id into v_board_energia_id;

  insert into public.kanban_columns (board_id, nome, posicao, is_padrao) values
    (v_board_energia_id, 'Novo Lead', 1, true),
    (v_board_energia_id, 'Em Conversa', 2, true),
    (v_board_energia_id, 'Qualificado', 3, true),
    (v_board_energia_id, 'Fechado', 4, true);

  insert into public.whatsapp_sessions (membro_id) values (new.usuario_id);

  insert into public.robo_acesso (membro_id) values (new.usuario_id);

  return new;
end;
$$;

-- Migração: quem já está aprovado hoje continua com o robô funcionando.
insert into robo_acesso (membro_id, status, liberado_em, termo_aceito_em)
select usuario_id,
       case when status = 'ativo' then 'liberado'::robo_status else 'sem_acesso'::robo_status end,
       case when status = 'ativo' then now() end,
       null
  from membros
on conflict (membro_id) do nothing;

-- Contagem diária de respostas do robô (limite_diario_mensagens).
create index if not exists agente_mensagens_agente_dia_idx
  on agente_mensagens (membro_id, created_at)
  where remetente = 'agente';

-- ============================================================================
-- ACCESS_LOGS (auditoria de ações de acesso)
-- ============================================================================
create table access_logs (
  id uuid primary key default gen_random_uuid(),
  -- quem fez (admin, ou o próprio membro ao solicitar o robô); null = sistema
  ator_id uuid references usuarios(id) on delete set null,
  membro_id uuid references usuarios(id) on delete set null,
  acao text not null,
  motivo text,
  detalhes jsonb,
  created_at timestamptz not null default now()
);
alter table access_logs enable row level security;

-- Leitura só admin. Escrita só pelo servidor (service-role), sem policy de insert.
create policy access_logs_select on access_logs for select
  using (private.is_admin());

create index access_logs_created_idx on access_logs (created_at desc);
create index access_logs_membro_idx on access_logs (membro_id, created_at desc);
