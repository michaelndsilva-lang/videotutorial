-- Fase 2, entrega 4: catálogo de produtos. O admin cadastra uma vez; todos os
-- membros aprovados veem no painel e na página pessoal, com o PRÓPRIO link de
-- compra (membros.link_loja). "Tenho interesse" vira lead com origem
-- 'catalogo'. Cliques em "Comprar" são registrados por produto e membro.

alter table membros add column link_loja text
  check (link_loja is null or link_loja ~* '^https://');

create table produto_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(btrim(nome)) between 1 and 40),
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table produto_categorias enable row level security;

create table produtos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references produto_categorias(id) on delete restrict,
  nome text not null check (char_length(btrim(nome)) between 1 and 100),
  descricao_curta text not null default '' check (char_length(descricao_curta) <= 200),
  descricao_completa text not null default '' check (char_length(descricao_completa) <= 4000),
  beneficios text[] not null default '{}',
  modo_de_uso text not null default '' check (char_length(modo_de_uso) <= 2000),
  -- caminhos no bucket público 'produtos'; a primeira é a capa
  imagens text[] not null default '{}',
  preco_referencia numeric(10,2) check (preco_referencia is null or preco_referencia >= 0),
  destaque boolean not null default false,
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table produtos enable row level security;

create index produtos_categoria_idx on produtos (categoria_id, ordem);

create trigger produtos_set_updated_at
  before update on produtos
  for each row execute function private.set_updated_at();

-- Scripts da biblioteca ligados a cada produto.
create table produto_scripts (
  produto_id uuid not null references produtos(id) on delete cascade,
  script_id uuid not null references scripts(id) on delete cascade,
  primary key (produto_id, script_id)
);
alter table produto_scripts enable row level security;

-- Cliques em "Comprar" (gravados pelo servidor ao redirecionar).
create table produto_cliques (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  membro_id uuid not null references membros(usuario_id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table produto_cliques enable row level security;

create index produto_cliques_idx on produto_cliques (produto_id, membro_id, created_at desc);

-- Leitura: admin ou membro aprovado (só ativos). Escrita: admin. As páginas
-- públicas leem pelo servidor (service-role).
create policy produto_categorias_select on produto_categorias for select
  using (private.is_admin() or (ativo and private.membro_aprovado(auth.uid())));
create policy produto_categorias_admin on produto_categorias for all
  using (private.is_admin()) with check (private.is_admin());

create policy produtos_select on produtos for select
  using (
    private.is_admin()
    or (
      ativo
      and private.membro_aprovado(auth.uid())
      and exists (select 1 from produto_categorias c where c.id = categoria_id and c.ativo)
    )
  );
create policy produtos_admin on produtos for all
  using (private.is_admin()) with check (private.is_admin());

create policy produto_scripts_select on produto_scripts for select
  using (private.is_admin() or private.membro_aprovado(auth.uid()));
create policy produto_scripts_admin on produto_scripts for all
  using (private.is_admin()) with check (private.is_admin());

create policy produto_cliques_select on produto_cliques for select
  using (private.is_admin() or membro_id = auth.uid());

-- ============================================================================
-- STORAGE: fotos dos produtos (público: aparecem nas páginas pessoais)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy produtos_storage_admin on storage.objects for all
  to authenticated
  using (bucket_id = 'produtos' and private.is_admin())
  with check (bucket_id = 'produtos' and private.is_admin());

-- Categorias iniciais (vazias; o admin cadastra os produtos).
insert into produto_categorias (nome, ordem) values
  ('Perfumaria', 0), ('Cosméticos ozonizados', 1), ('Suplementos', 2);
