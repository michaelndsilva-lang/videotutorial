-- Fase 3, entrega 2: mural (avisos fixados + conquistas com curtidas) e
-- agenda (eventos/lives). Lembrete por WhatsApp 1 h antes só para quem pediu
-- ("Quero ser lembrado"): os avisos saem do número pessoal do admin
-- (instância agenda-lembretes), e mandar para todos a cada evento aumenta o
-- risco de bloqueio do número.

create table avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  texto text not null default '' check (char_length(texto) <= 2000),
  fixado boolean not null default false,
  ativo boolean not null default true,
  expira_em timestamptz,
  created_by uuid references usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table avisos enable row level security;

create policy avisos_select on avisos for select
  using (
    private.is_admin()
    or (ativo and (expira_em is null or expira_em > now()) and private.membro_aprovado(auth.uid()))
  );
create policy avisos_admin on avisos for all
  using (private.is_admin()) with check (private.is_admin());

create table eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  descricao text not null default '' check (char_length(descricao) <= 2000),
  inicio timestamptz not null,
  duracao_min int not null default 60 check (duracao_min between 5 and 600),
  link text check (link is null or link ~* '^https://'),
  ativo boolean not null default true,
  lembrete_enviado_em timestamptz,
  created_by uuid references usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table eventos enable row level security;

create index eventos_inicio_idx on eventos (inicio);

create policy eventos_select on eventos for select
  using (private.is_admin() or (ativo and private.membro_aprovado(auth.uid())));
create policy eventos_admin on eventos for all
  using (private.is_admin()) with check (private.is_admin());

-- Quem quer ser lembrado de cada evento.
create table evento_lembretes (
  evento_id uuid not null references eventos(id) on delete cascade,
  membro_id uuid not null references membros(usuario_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (evento_id, membro_id)
);
alter table evento_lembretes enable row level security;

create policy evento_lembretes_select on evento_lembretes for select
  using (membro_id = auth.uid() or private.is_admin());
create policy evento_lembretes_insert on evento_lembretes for insert
  with check (
    membro_id = auth.uid()
    and private.membro_aprovado(auth.uid())
    and exists (select 1 from eventos e where e.id = evento_id and e.ativo and e.inicio > now())
  );
create policy evento_lembretes_delete on evento_lembretes for delete
  using (membro_id = auth.uid() or private.is_admin());

-- Mural de conquistas: o membro publica, a equipe curte, o admin modera.
create table conquistas (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references membros(usuario_id) on delete cascade,
  texto text not null check (char_length(btrim(texto)) between 1 and 280),
  oculta boolean not null default false,
  created_at timestamptz not null default now()
);
alter table conquistas enable row level security;

create index conquistas_recentes_idx on conquistas (created_at desc);

create policy conquistas_select on conquistas for select
  using (private.is_admin() or (not oculta and private.membro_aprovado(auth.uid())));
create policy conquistas_insert on conquistas for insert
  with check (membro_id = auth.uid() and private.membro_aprovado(auth.uid()) and not oculta);
create policy conquistas_delete on conquistas for delete
  using (membro_id = auth.uid() or private.is_admin());
create policy conquistas_admin_update on conquistas for update
  using (private.is_admin()) with check (private.is_admin());

create table conquista_curtidas (
  conquista_id uuid not null references conquistas(id) on delete cascade,
  membro_id uuid not null references membros(usuario_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conquista_id, membro_id)
);
alter table conquista_curtidas enable row level security;

create policy conquista_curtidas_select on conquista_curtidas for select
  using (private.is_admin() or private.membro_aprovado(auth.uid()));
create policy conquista_curtidas_insert on conquista_curtidas for insert
  with check (membro_id = auth.uid() and private.membro_aprovado(auth.uid()));
create policy conquista_curtidas_delete on conquista_curtidas for delete
  using (membro_id = auth.uid());
