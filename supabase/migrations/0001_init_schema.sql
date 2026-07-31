-- Atlântica Consultores: schema inicial (Fase 1)
-- Organização única (não multi-tenant). Isolamento por linha via usuario_id/membro_id.
-- RLS usa a função is_admin(), que consulta a tabela usuarios pelo auth.uid() do JWT.

create extension if not exists pgcrypto;

-- ============================================================================
-- ENUMS
-- ============================================================================
create type user_role as enum ('admin', 'membro');
create type membro_status as enum ('pendente', 'ativo', 'inativo');
create type agente_modo as enum ('recrutamento', 'energia');
create type whatsapp_status as enum ('desconectado', 'aguardando_qr', 'conectado', 'erro');
create type card_origem as enum ('manual', 'agente_ia');

-- ============================================================================
-- HELPERS
-- ============================================================================
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- USUARIOS (1:1 com auth.users)
-- ============================================================================
create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  nome_completo text,
  email text not null,
  created_at timestamptz not null default now()
);
alter table usuarios enable row level security;

-- is_admin() só pode ser criada depois de `usuarios` existir (função `language sql`
-- é validada contra o catálogo já na criação, não só na primeira chamada).
-- security definer: evita recursão de RLS ao checar o papel do usuário logado.
create function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios where id = auth.uid() and role = 'admin'
  );
$$;

create policy usuarios_select on usuarios for select
  using (id = auth.uid() or is_admin());
create policy usuarios_update_self on usuarios for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================================
-- MEMBROS (dados extras, só existe para role = 'membro')
-- ============================================================================
create table membros (
  usuario_id uuid primary key references usuarios(id) on delete cascade,
  status membro_status not null default 'pendente',
  link_recrutamento text,
  link_energia text,
  observacoes text,
  modo_agente_ativo agente_modo not null default 'recrutamento',
  created_at timestamptz not null default now()
);
alter table membros enable row level security;

create policy membros_select on membros for select
  using (usuario_id = auth.uid() or is_admin());
create policy membros_update on membros for update
  using (usuario_id = auth.uid() or is_admin())
  with check (usuario_id = auth.uid() or is_admin());
create policy membros_admin_all on membros for all
  using (is_admin())
  with check (is_admin());

-- Só o admin pode alterar o status (aprovação/reprovação/remoção lógica).
create function public.prevent_membro_self_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> old.status and not public.is_admin() then
    raise exception 'apenas o admin pode alterar o status do membro';
  end if;
  return new;
end;
$$;

create trigger before_membro_update
  before update on membros
  for each row execute function prevent_membro_self_status_change();

-- ============================================================================
-- AGENTES_CONFIG (2 linhas fixas: recrutamento / energia — só admin edita)
-- ============================================================================
create table agentes_config (
  id uuid primary key default gen_random_uuid(),
  modo agente_modo not null unique,
  prompt_sistema text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references usuarios(id)
);
alter table agentes_config enable row level security;

create policy agentes_config_read on agentes_config for select
  using (auth.uid() is not null);
create policy agentes_config_write on agentes_config for all
  using (is_admin())
  with check (is_admin());

create trigger agentes_config_set_updated_at
  before update on agentes_config
  for each row execute function set_updated_at();

insert into agentes_config (modo, prompt_sistema) values
  ('recrutamento', ''),
  ('energia', '');

-- ============================================================================
-- WHATSAPP_SESSIONS (1:1 por membro)
-- ============================================================================
create table whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null unique references membros(usuario_id) on delete cascade,
  status whatsapp_status not null default 'desconectado',
  instance_name text,
  qr_code text,
  phone_number text,
  connected_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table whatsapp_sessions enable row level security;

-- Apenas leitura para o próprio membro/admin. Escrita é feita pela API (service-role),
-- que recebe os eventos da instância de WhatsApp (QR code, conexão, etc.).
create policy whatsapp_sessions_select on whatsapp_sessions for select
  using (membro_id = auth.uid() or is_admin());

create trigger whatsapp_sessions_set_updated_at
  before update on whatsapp_sessions
  for each row execute function set_updated_at();

-- ============================================================================
-- KANBAN_BOARDS (1:1 por membro, criado automaticamente)
-- ============================================================================
create table kanban_boards (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null unique references membros(usuario_id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table kanban_boards enable row level security;

create policy kanban_boards_all on kanban_boards for all
  using (membro_id = auth.uid() or is_admin())
  with check (membro_id = auth.uid() or is_admin());

-- ============================================================================
-- KANBAN_COLUMNS (colunas customizáveis; seed padrão criado com o board)
-- ============================================================================
create table kanban_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references kanban_boards(id) on delete cascade,
  nome text not null,
  posicao int not null,
  is_padrao boolean not null default false,
  unique (board_id, posicao)
);
alter table kanban_columns enable row level security;

create policy kanban_columns_all on kanban_columns for all
  using (
    is_admin() or board_id in (select id from kanban_boards where membro_id = auth.uid())
  )
  with check (
    is_admin() or board_id in (select id from kanban_boards where membro_id = auth.uid())
  );

-- ============================================================================
-- KANBAN_CARDS
-- ============================================================================
create table kanban_cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references kanban_boards(id) on delete cascade,
  coluna_id uuid not null references kanban_columns(id),
  nome_lead text not null,
  telefone text,
  origem card_origem not null default 'manual',
  observacoes text,
  posicao numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table kanban_cards enable row level security;

create policy kanban_cards_all on kanban_cards for all
  using (
    is_admin() or board_id in (select id from kanban_boards where membro_id = auth.uid())
  )
  with check (
    is_admin() or board_id in (select id from kanban_boards where membro_id = auth.uid())
  );

create trigger kanban_cards_set_updated_at
  before update on kanban_cards
  for each row execute function set_updated_at();

-- ============================================================================
-- TRIGGERS DE CRIAÇÃO EM CADEIA
-- auth.users -> usuarios (+ membros se role = 'membro') -> kanban_board + colunas + whatsapp_session
-- ============================================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
begin
  v_role := coalesce((new.raw_app_meta_data ->> 'role')::user_role, 'membro');

  insert into public.usuarios (id, role, nome_completo, email)
  values (new.id, v_role, new.raw_user_meta_data ->> 'full_name', new.email);

  if v_role = 'membro' then
    insert into public.membros (usuario_id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create function public.handle_new_membro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_board_id uuid;
begin
  insert into public.kanban_boards (membro_id) values (new.usuario_id)
  returning id into v_board_id;

  insert into public.kanban_columns (board_id, nome, posicao, is_padrao) values
    (v_board_id, 'Novo Lead', 1, true),
    (v_board_id, 'Em Conversa', 2, true),
    (v_board_id, 'Qualificado', 3, true),
    (v_board_id, 'Fechado', 4, true);

  insert into public.whatsapp_sessions (membro_id) values (new.usuario_id);

  return new;
end;
$$;

create trigger on_membro_created
  after insert on membros
  for each row execute function handle_new_membro();

-- ============================================================================
-- ÍNDICES
-- ============================================================================
create index idx_membros_status on membros(status);
create index idx_kanban_columns_board on kanban_columns(board_id);
create index idx_kanban_cards_board_coluna on kanban_cards(board_id, coluna_id);
