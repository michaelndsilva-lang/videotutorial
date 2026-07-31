-- Configurações gerais da plataforma (linha única). Somente admin edita;
-- leitura liberada para qualquer usuário autenticado, no mesmo padrão de agentes_config.
create table configuracoes_gerais (
  id uuid primary key default gen_random_uuid(),
  nome_empresa text not null default '',
  link_recrutamento_padrao text,
  link_energia_padrao text,
  updated_at timestamptz not null default now(),
  updated_by uuid references usuarios(id)
);
alter table configuracoes_gerais enable row level security;

create policy configuracoes_gerais_read on configuracoes_gerais for select
  using (auth.uid() is not null);
create policy configuracoes_gerais_write on configuracoes_gerais for all
  using (private.is_admin())
  with check (private.is_admin());

create trigger configuracoes_gerais_set_updated_at
  before update on configuracoes_gerais
  for each row execute function private.set_updated_at();

insert into configuracoes_gerais (nome_empresa) values ('Atlântica Consultores');
