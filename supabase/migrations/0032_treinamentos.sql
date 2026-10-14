-- Fase 1, entrega 3: ATL FLIX (aba Treinamentos). Cursos por categoria, aulas
-- com vídeo do YouTube (não listado) e progresso por aula, marcado sozinho
-- quando o vídeo termina. Só o admin cria/edita; membro aprovado assiste.

create table cursos (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (char_length(btrim(categoria)) between 1 and 60),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  descricao text not null default '' check (char_length(descricao) <= 2000),
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table cursos enable row level security;

create index cursos_lista_idx on cursos (categoria, ordem);

create policy cursos_select on cursos for select
  using (private.is_admin() or (ativo and private.membro_aprovado(auth.uid())));
create policy cursos_admin on cursos for all
  using (private.is_admin()) with check (private.is_admin());

create trigger cursos_set_updated_at
  before update on cursos
  for each row execute function private.set_updated_at();

create table aulas (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  descricao text not null default '' check (char_length(descricao) <= 2000),
  video_url text not null check (video_url ~* '^https://'),
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table aulas enable row level security;

create index aulas_curso_idx on aulas (curso_id, ordem);

-- Aula visível ao membro só se ela e o curso estiverem ativos.
create function private.aula_visivel(p_aula uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.aulas a join public.cursos c on c.id = a.curso_id
     where a.id = p_aula and a.ativo and c.ativo
  );
$$;

create policy aulas_select on aulas for select
  using (private.is_admin() or (private.membro_aprovado(auth.uid()) and private.aula_visivel(id)));
create policy aulas_admin on aulas for all
  using (private.is_admin()) with check (private.is_admin());

create trigger aulas_set_updated_at
  before update on aulas
  for each row execute function private.set_updated_at();

create table aula_progresso (
  membro_id uuid not null references membros(usuario_id) on delete cascade,
  aula_id uuid not null references aulas(id) on delete cascade,
  concluido_em timestamptz not null default now(),
  primary key (membro_id, aula_id)
);
alter table aula_progresso enable row level security;

create policy aula_progresso_select on aula_progresso for select
  using (private.is_admin() or membro_id = auth.uid());
create policy aula_progresso_insert on aula_progresso for insert
  with check (
    membro_id = auth.uid()
    and private.membro_aprovado(auth.uid())
    and private.aula_visivel(aula_id)
  );
create policy aula_progresso_delete on aula_progresso for delete
  using (membro_id = auth.uid() and private.membro_aprovado(auth.uid()));

-- ============================================================================
-- RASCUNHO INICIAL (curso desativado: o admin revisa, adiciona aulas e ativa).
-- ============================================================================
with curso as (
  insert into cursos (categoria, titulo, descricao, ordem, ativo)
  values (
    'Primeiros passos',
    'Comece por aqui',
    'O básico para quem acabou de entrar na Atlântica Natural: a apresentação do negócio e como fazer o primeiro pedido.',
    0,
    false
  )
  returning id
)
insert into aulas (curso_id, titulo, descricao, video_url, ordem, ativo)
select curso.id, a.titulo, a.descricao, a.video_url, a.ordem, true
from curso, (values
  ('Apresentação do negócio', 'Entenda a oportunidade da Atlântica Natural: produtos, serviços e as duas formas de ganho.', 'https://youtu.be/rx4rIIrTJDo', 0),
  ('Seu primeiro pedido', 'Passo a passo do primeiro pedido no escritório virtual.', 'https://youtu.be/sNDwQdAXJkc', 1)
) as a(titulo, descricao, video_url, ordem);
