-- Fase 2, entrega 1: Kanban turbinado.
-- - origem ganha 'pagina', 'simulador' e 'catalogo' (leads das próximas entregas);
-- - proximo_followup: data em que o membro quer voltar a falar com o lead;
-- - movido_em: última troca de coluna. Não dá para usar updated_at porque o
--   drag-and-drop (persistBoardOrder) regrava a posição de todos os cards da
--   coluna, o que faria todo mundo parecer "movido agora".
alter type card_origem add value if not exists 'pagina';
alter type card_origem add value if not exists 'simulador';
alter type card_origem add value if not exists 'catalogo';

alter table kanban_cards
  add column proximo_followup date,
  add column movido_em timestamptz not null default now();

-- Cards antigos: a melhor estimativa de "última movimentação" é o updated_at.
update kanban_cards set movido_em = updated_at;

create function private.kanban_card_movido()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.coluna_id is distinct from old.coluna_id then
    new.movido_em := now();
  end if;
  return new;
end;
$$;

create trigger kanban_cards_movido
  before update of coluna_id on kanban_cards
  for each row execute function private.kanban_card_movido();

create index kanban_cards_followup_idx on kanban_cards (board_id, proximo_followup)
  where proximo_followup is not null;
