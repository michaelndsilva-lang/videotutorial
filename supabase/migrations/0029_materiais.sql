-- Fase 0, trava 3: biblioteca de materiais oficiais. Só o admin cria, edita,
-- reordena, desativa e remove; o membro aprovado visualiza, baixa (se
-- permitido) e compartilha. Material desativado some para o membro e o
-- storage passa a recusar o acesso ao arquivo.

-- Membro com cadastro aprovado. security definer para a policy não depender
-- do RLS de membros (mesmo padrão de private.is_admin()).
create function private.membro_aprovado(p_usuario_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.membros where usuario_id = p_usuario_id and status = 'ativo'
  );
$$;

create table materiais (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (char_length(btrim(categoria)) between 1 and 60),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  descricao text not null default '' check (char_length(descricao) <= 1000),
  tipo text not null check (tipo in ('pdf', 'apresentacao', 'imagem', 'video')),
  -- arquivo no bucket 'materiais' (pdf/apresentação/imagem/vídeo curto) ...
  arquivo_path text unique,
  nome_arquivo text,
  mime_type text,
  tamanho_bytes bigint,
  -- ... ou link externo (só vídeo: YouTube, Drive etc.)
  video_url text check (video_url is null or video_url ~* '^https://'),
  permitir_download boolean not null default true,
  -- link público /m/<id> para o membro mandar ao lead no WhatsApp
  compartilhavel boolean not null default true,
  ativo boolean not null default true,
  ordem int not null default 0,
  created_by uuid references usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint materiais_origem check (
    (arquivo_path is not null and video_url is null)
    or (tipo = 'video' and video_url is not null and arquivo_path is null)
  )
);
alter table materiais enable row level security;

create index materiais_lista_idx on materiais (categoria, ordem);

create policy materiais_select on materiais for select
  using (private.is_admin() or (ativo and private.membro_aprovado(auth.uid())));

create policy materiais_admin_write on materiais for all
  using (private.is_admin())
  with check (private.is_admin());

create trigger materiais_set_updated_at
  before update on materiais
  for each row execute function private.set_updated_at();

-- ============================================================================
-- STORAGE: bucket privado. Admin faz tudo; membro aprovado só lê arquivos de
-- materiais ativos (é o que permite gerar a signed URL com o client dele).
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materiais',
  'materiais',
  false,
  52428800, -- 50 MB (limite por arquivo do plano gratuito)
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4'
  ]
)
on conflict (id) do nothing;

create policy materiais_storage_admin on storage.objects for all
  to authenticated
  using (bucket_id = 'materiais' and private.is_admin())
  with check (bucket_id = 'materiais' and private.is_admin());

create policy materiais_storage_membro_leitura on storage.objects for select
  to authenticated
  using (
    bucket_id = 'materiais'
    and private.membro_aprovado(auth.uid())
    and exists (
      select 1 from public.materiais m where m.arquivo_path = name and m.ativo
    )
  );
