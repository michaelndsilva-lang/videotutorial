-- Cada membro passa a ter dois quadros de Kanban — um para leads de
-- recrutamento e outro para leads de energia por assinatura — em vez de um
-- único board. Reaproveita o enum agente_modo (já usado em membros).
alter table kanban_boards
  add column modo agente_modo not null default 'recrutamento';

alter table kanban_boards
  drop constraint kanban_boards_membro_id_key;

alter table kanban_boards
  add constraint kanban_boards_membro_id_modo_key unique (membro_id, modo);

-- Cria o board de energia (+ colunas padrão) para os membros que já existiam
-- antes desta migration (o board de recrutamento já existe e ganhou modo
-- 'recrutamento' pelo default acima).
insert into kanban_boards (membro_id, modo)
select usuario_id, 'energia'
from membros
on conflict (membro_id, modo) do nothing;

insert into kanban_columns (board_id, nome, posicao, is_padrao)
select b.id, col.nome, col.posicao, true
from kanban_boards b
cross join (
  values ('Novo Lead', 1), ('Em Conversa', 2), ('Qualificado', 3), ('Fechado', 4)
) as col(nome, posicao)
where b.modo = 'energia'
  and not exists (select 1 from kanban_columns c where c.board_id = b.id);

-- Novos membros passam a ganhar os dois boards automaticamente. A função vive
-- em `private` (movida lá pela migration 0002), não em `public`.
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

  return new;
end;
$$;
