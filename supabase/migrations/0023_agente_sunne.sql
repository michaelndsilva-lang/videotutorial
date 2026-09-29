-- Agente SUNNE: robô exclusivo, liberado membro a membro (hoje só o Michel,
-- michael.upbelem@gmail.com). Diferente de recrutamento/energia, o prompt não
-- fica em agentes_config (que qualquer usuário autenticado pode ler) e sim em
-- sunne_config, por membro, junto com a base de conhecimento (PDFs) e os
-- vídeos curtos que o agente envia aos leads. Nenhum outro membro enxerga nada
-- disso: todo acesso passa por private.sunne_habilitado(auth.uid()).

-- ============================================================================
-- FLAG DE ACESSO
-- ============================================================================
alter table membros
  add column sunne_habilitado boolean not null default false;

create function private.sunne_habilitado(p_usuario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select sunne_habilitado from public.membros where usuario_id = p_usuario_id),
    false
  )
$$;
revoke execute on function private.sunne_habilitado(uuid) from public;
grant execute on function private.sunne_habilitado(uuid) to authenticated, service_role;

-- Membro não pode se auto-habilitar nem ativar o modo 'sunne' sem estar
-- habilitado (a tela esconde, mas a API do Supabase é acessível direto).
create function private.proteger_sunne_membro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sunne_habilitado is distinct from old.sunne_habilitado
     and auth.uid() is not null -- sem usuário = SQL direto / service-role
     and not private.is_admin() then
    raise exception 'apenas o admin pode liberar o agente SUNNE';
  end if;
  if new.modo_agente_ativo = 'sunne' and not new.sunne_habilitado then
    raise exception 'agente SUNNE não está disponível para este membro';
  end if;
  return new;
end;
$$;

create trigger before_membro_update_sunne
  before update on membros
  for each row execute function private.proteger_sunne_membro();

-- ============================================================================
-- SUNNE_CONFIG (1 linha por membro habilitado)
-- ============================================================================
create table sunne_config (
  membro_id uuid primary key references membros(usuario_id) on delete cascade,
  prompt_sistema text not null default '',
  prompt_followup text not null default '',
  updated_at timestamptz not null default now()
);
alter table sunne_config enable row level security;

create policy sunne_config_owner on sunne_config for all
  using (membro_id = auth.uid() and private.sunne_habilitado(auth.uid()))
  with check (membro_id = auth.uid() and private.sunne_habilitado(auth.uid()));

create trigger sunne_config_set_updated_at
  before update on sunne_config
  for each row execute function private.set_updated_at();

-- ============================================================================
-- SUNNE_MATERIAIS (PDFs de conhecimento + vídeos curtos para enviar ao lead)
-- ============================================================================
create table sunne_materiais (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references membros(usuario_id) on delete cascade,
  tipo text not null check (tipo in ('pdf', 'video')),
  titulo text not null,
  -- Vídeo: quando o agente deve enviar. PDF: observação opcional.
  descricao text not null default '',
  storage_path text not null unique,
  mime_type text not null,
  tamanho_bytes bigint not null,
  -- Texto extraído do PDF no upload; é o que o agente "aprende".
  conteudo_texto text,
  created_at timestamptz not null default now()
);
alter table sunne_materiais enable row level security;

create policy sunne_materiais_owner on sunne_materiais for all
  using (membro_id = auth.uid() and private.sunne_habilitado(auth.uid()))
  with check (membro_id = auth.uid() and private.sunne_habilitado(auth.uid()));

create index idx_sunne_materiais_membro on sunne_materiais (membro_id, tipo, created_at);

-- ============================================================================
-- STORAGE: bucket privado, cada membro só mexe na própria pasta ({uid}/...)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sunne',
  'sunne',
  false,
  26214400, -- 25 MB
  array['application/pdf', 'video/mp4']
)
on conflict (id) do nothing;

create policy sunne_storage_owner on storage.objects for all
  to authenticated
  using (
    bucket_id = 'sunne'
    and (storage.foldername(name))[1] = auth.uid()::text
    and private.sunne_habilitado(auth.uid())
  )
  with check (
    bucket_id = 'sunne'
    and (storage.foldername(name))[1] = auth.uid()::text
    and private.sunne_habilitado(auth.uid())
  );

-- ============================================================================
-- LIBERA PARA O MICHEL (por e-mail, sem id fixo) + board de Kanban do SUNNE
-- ============================================================================
update membros m
set sunne_habilitado = true
from usuarios u
where u.id = m.usuario_id
  and lower(u.email) = 'michael.upbelem@gmail.com';

insert into sunne_config (membro_id)
select usuario_id from membros where sunne_habilitado
on conflict (membro_id) do nothing;

with novos as (
  insert into kanban_boards (membro_id, modo)
  select usuario_id, 'sunne' from membros where sunne_habilitado
  on conflict (membro_id, modo) do nothing
  returning id
)
insert into kanban_columns (board_id, nome, posicao, is_padrao)
select n.id, col.nome, col.posicao, true
from novos n
cross join (
  values ('Novo Lead', 1), ('Em Conversa', 2), ('Qualificado', 3), ('Fechado', 4)
) as col(nome, posicao);
