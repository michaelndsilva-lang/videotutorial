-- Fase 3, entrega 1: patrocinador (quem convidou quem), radar de atividade
-- e pedido de ajuda. O radar serve ao admin (todos) e a quem tem indicados
-- (só a própria linha descendente) — decisão do admin em 2026-10-14.

-- ============================================================================
-- PATROCINADOR, CÓDIGO DE CONVITE E ÚLTIMO ACESSO
-- ============================================================================
alter table membros
  add column patrocinador_id uuid references membros(usuario_id) on delete set null,
  add column codigo_convite text,
  add column ultimo_acesso timestamptz,
  add constraint membros_patrocinador_nao_proprio check (patrocinador_id is distinct from usuario_id);

update membros
   set codigo_convite = substr(md5(random()::text || usuario_id::text), 1, 8)
 where codigo_convite is null;
alter table membros
  alter column codigo_convite set default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  alter column codigo_convite set not null,
  add constraint membros_codigo_convite_key unique (codigo_convite);

create index membros_patrocinador_idx on membros (patrocinador_id);

-- Linha descendente (indicados, indicados dos indicados...).
create function private.descendentes(p_membro uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  with recursive arvore as (
    select usuario_id from membros where patrocinador_id = p_membro
    union
    select m.usuario_id from membros m join arvore a on m.patrocinador_id = a.usuario_id
  )
  select usuario_id from arvore;
$$;

create function private.eh_descendente(p_lider uuid, p_membro uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from private.descendentes(p_lider) d where d = p_membro);
$$;

-- Membro não muda patrocinador nem código; ninguém vira patrocinador de um
-- descendente (evita ciclo).
create function private.proteger_patrocinio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not private.is_admin() then
    new.patrocinador_id := old.patrocinador_id;
    new.codigo_convite := old.codigo_convite;
    new.ultimo_acesso := old.ultimo_acesso;
  end if;
  if new.patrocinador_id is not null
     and new.patrocinador_id is distinct from old.patrocinador_id
     and private.eh_descendente(new.usuario_id, new.patrocinador_id) then
    raise exception 'esse patrocinador está na linha descendente deste membro';
  end if;
  return new;
end;
$$;

create trigger before_membro_update_patrocinio
  before update on membros
  for each row execute function private.proteger_patrocinio();

-- ============================================================================
-- PEDIDOS DE AJUDA
-- ============================================================================
create table pedidos_ajuda (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references membros(usuario_id) on delete cascade,
  categoria text not null check (categoria in ('abordagem', 'objecao', 'plataforma', 'energia', 'produtos', 'outro')),
  mensagem text not null check (char_length(btrim(mensagem)) between 1 and 1000),
  status text not null default 'aberto' check (status in ('aberto', 'em_atendimento', 'resolvido')),
  resposta text check (resposta is null or char_length(resposta) <= 1000),
  atendido_por uuid references usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table pedidos_ajuda enable row level security;

create index pedidos_ajuda_membro_idx on pedidos_ajuda (membro_id, created_at desc);
create index pedidos_ajuda_status_idx on pedidos_ajuda (status, created_at desc);

create trigger pedidos_ajuda_set_updated_at
  before update on pedidos_ajuda
  for each row execute function private.set_updated_at();

-- Membro abre e vê os próprios; admin e quem está acima na linha (patrocinador,
-- patrocinador do patrocinador...) veem e atendem.
create policy pedidos_ajuda_insert on pedidos_ajuda for insert
  with check (membro_id = auth.uid() and private.membro_aprovado(auth.uid()) and status = 'aberto');
create policy pedidos_ajuda_select on pedidos_ajuda for select
  using (
    membro_id = auth.uid()
    or private.is_admin()
    or private.eh_descendente(auth.uid(), membro_id)
  );
create policy pedidos_ajuda_update on pedidos_ajuda for update
  using (private.is_admin() or (private.membro_aprovado(auth.uid()) and private.eh_descendente(auth.uid(), membro_id)))
  with check (private.is_admin() or private.eh_descendente(auth.uid(), membro_id));

-- ============================================================================
-- RADAR: última atividade de cada membro visível para quem chama
-- ============================================================================
create function public.radar_equipe()
returns table (
  membro_id uuid,
  nome text,
  email text,
  telefone text,
  patrocinador_id uuid,
  aprovado_em timestamptz,
  ultimo_acesso timestamptz,
  ultima_acao timestamptz,
  ultima_atividade timestamptz,
  leads_7d bigint,
  ajudas_abertas bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with visiveis as (
    select m.usuario_id
      from membros m
     where m.status = 'ativo'
       and (
         private.is_admin()
         -- cron do resumo diário (servidor); anon não tem execute
         or auth.role() = 'service_role'
         or m.usuario_id in (select private.descendentes(auth.uid()))
       )
  ),
  boards as (
    select b.id, b.membro_id from kanban_boards b join visiveis v on v.usuario_id = b.membro_id
  ),
  acoes as (
    -- cards criados à mão ou movidos de coluna de verdade (os criados pelo
    -- robô não contam como atividade do membro)
    select b.membro_id, max(greatest(
             case when c.origem = 'manual' then c.created_at end,
             case when c.movido_em > c.created_at + interval '1 minute' then c.movido_em end
           )) as quando
      from kanban_cards c join boards b on b.id = c.board_id
     group by b.membro_id
    union all
    select usuario_id, max(created_at) from conteudo_geracoes group by usuario_id
    union all
    select membro_id, max(created_at) from mentor_perguntas group by membro_id
    union all
    select membro_id, max(concluido_em) from aula_progresso group by membro_id
    union all
    select membro_id, max(concluido_em) from missao_progresso group by membro_id
    union all
    select membro_id, max(created_at) from script_usos group by membro_id
  ),
  ultima as (
    select membro_id, max(quando) as quando from acoes group by membro_id
  ),
  leads as (
    select b.membro_id, count(*) as total
      from kanban_cards c join boards b on b.id = c.board_id
     where c.created_at > now() - interval '7 days'
     group by b.membro_id
  ),
  ajudas as (
    select membro_id, count(*) as total from pedidos_ajuda where status <> 'resolvido' group by membro_id
  )
  select m.usuario_id,
         coalesce(pc.nome_exibicao, u.nome_completo, u.email),
         u.email,
         coalesce(p.whatsapp, nullif(regexp_replace(coalesce(pc.whatsapp, ''), '\D', '', 'g'), ''), w.phone_number),
         m.patrocinador_id,
         m.aprovado_em,
         m.ultimo_acesso,
         ul.quando,
         greatest(m.ultimo_acesso, ul.quando, m.aprovado_em, m.created_at),
         coalesce(l.total, 0),
         coalesce(a.total, 0)
    from visiveis v
    join membros m on m.usuario_id = v.usuario_id
    join usuarios u on u.id = m.usuario_id
    left join perfil_conteudo pc on pc.usuario_id = m.usuario_id
    left join paginas p on p.membro_id = m.usuario_id
    left join whatsapp_sessions w on w.membro_id = m.usuario_id
    left join ultima ul on ul.membro_id = m.usuario_id
    left join leads l on l.membro_id = m.usuario_id
    left join ajudas a on a.membro_id = m.usuario_id;
$$;

revoke execute on function public.radar_equipe() from public, anon;
grant execute on function public.radar_equipe() to authenticated, service_role;
