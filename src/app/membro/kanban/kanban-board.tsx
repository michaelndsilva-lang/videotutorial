"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KanbanColumn } from "./kanban-column";
import { KanbanCardView } from "./kanban-card";
import { CardDialog } from "./card-dialog";
import { createColumn, deleteColumn, persistBoardOrder, renameColumn } from "./actions";
import type { CardRow, ColumnRow } from "./types";

function groupCardsByColumn(columns: ColumnRow[], cards: CardRow[]) {
  const map: Record<string, CardRow[]> = {};
  for (const col of columns) {
    map[col.id] = cards
      .filter((c) => c.coluna_id === col.id)
      .sort((a, b) => a.posicao - b.posicao);
  }
  return map;
}

export function KanbanBoard({
  boardId,
  columns,
  cards,
}: {
  boardId: string;
  columns: ColumnRow[];
  cards: CardRow[];
}) {
  const router = useRouter();
  const [cardsByColumn, setCardsByColumn] = useState<Record<string, CardRow[]>>(() =>
    groupCardsByColumn(columns, cards)
  );
  const [activeCard, setActiveCard] = useState<CardRow | null>(null);
  const [cardDialog, setCardDialog] = useState<{ colunaId: string | null; card: CardRow | null } | null>(
    null
  );
  const [addingColumn, setAddingColumn] = useState(false);
  const [novaColunaNome, setNovaColunaNome] = useState("");
  const dragStartSnapshot = useRef<Record<string, string[]>>({});

  // Resincroniza quando o server component busca dados novos (após um
  // create/edit/delete + router.refresh()) — padrão React: ajustar estado em
  // resposta a props mudando, direto no corpo do render, sem useEffect.
  const [prevColumns, setPrevColumns] = useState(columns);
  const [prevCards, setPrevCards] = useState(cards);
  if (columns !== prevColumns || cards !== prevCards) {
    setPrevColumns(columns);
    setPrevCards(cards);
    setCardsByColumn(groupCardsByColumn(columns, cards));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function findColumnOfCard(cardId: string) {
    return Object.keys(cardsByColumn).find((colId) =>
      cardsByColumn[colId].some((c) => c.id === cardId)
    );
  }

  function handleDragStart(event: DragStartEvent) {
    dragStartSnapshot.current = Object.fromEntries(
      Object.entries(cardsByColumn).map(([colId, list]) => [colId, list.map((c) => c.id)])
    );
    const all = Object.values(cardsByColumn).flat();
    setActiveCard(all.find((c) => c.id === event.active.id) ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const fromColId = findColumnOfCard(activeId);
    const toColId = columns.some((c) => c.id === overId) ? overId : findColumnOfCard(overId);

    if (!fromColId || !toColId || fromColId === toColId) return;

    setCardsByColumn((prev) => {
      const fromCards = [...prev[fromColId]];
      const idx = fromCards.findIndex((c) => c.id === activeId);
      if (idx === -1) return prev;
      const [moved] = fromCards.splice(idx, 1);

      const toCards = [...prev[toColId]];
      const overIdx = toCards.findIndex((c) => c.id === overId);
      const insertAt = overIdx === -1 ? toCards.length : overIdx;
      toCards.splice(insertAt, 0, { ...moved, coluna_id: toColId });

      return { ...prev, [fromColId]: fromCards, [toColId]: toCards };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const colId = findColumnOfCard(activeId);
    if (!colId) return;

    // Cálculo puro primeiro; setState e a Server Action ficam fora da função de
    // atualização (updater), que precisa ser livre de efeitos colaterais.
    const colCards = [...cardsByColumn[colId]];
    const oldIndex = colCards.findIndex((c) => c.id === activeId);
    const overIndex = colCards.findIndex((c) => c.id === overId);
    const reordered =
      overIndex === -1 || oldIndex === -1 ? colCards : arrayMove(colCards, oldIndex, overIndex);
    const next = { ...cardsByColumn, [colId]: reordered };

    const toPersist: { colunaId: string; cardIds: string[] }[] = [];
    for (const cId of Object.keys(next)) {
      const before = dragStartSnapshot.current[cId] ?? [];
      const after = next[cId].map((c) => c.id);
      const changed = before.length !== after.length || before.some((id, i) => id !== after[i]);
      if (changed) {
        toPersist.push({ colunaId: cId, cardIds: after });
      }
    }

    setCardsByColumn(next);

    if (toPersist.length > 0) {
      persistBoardOrder(toPersist).catch((error) => {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar a ordem.");
      });
    }
  }

  function handleSaved() {
    router.refresh();
  }

  function handleRenameColumn(colunaId: string, nome: string) {
    renameColumn(colunaId, nome)
      .then(() => router.refresh())
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Não foi possível renomear.");
      });
  }

  function handleDeleteColumn(colunaId: string) {
    deleteColumn(colunaId)
      .then(() => router.refresh())
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
      });
  }

  function handleAddColumn() {
    const nome = novaColunaNome.trim();
    if (!nome) {
      setAddingColumn(false);
      return;
    }
    createColumn(boardId, nome)
      .then(() => {
        setNovaColunaNome("");
        setAddingColumn(false);
        router.refresh();
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Não foi possível criar a coluna.");
      });
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              cards={cardsByColumn[column.id] ?? []}
              onAddCard={() => setCardDialog({ colunaId: column.id, card: null })}
              onEditCard={(card) => setCardDialog({ colunaId: column.id, card })}
              onRename={(nome) => handleRenameColumn(column.id, nome)}
              onDelete={() => handleDeleteColumn(column.id)}
            />
          ))}

          <div className="flex w-64 shrink-0 flex-col gap-2 pt-1">
            {addingColumn ? (
              <div className="flex flex-col gap-2 rounded-xl border border-dashed p-3">
                <Input
                  autoFocus
                  placeholder="Nome da coluna"
                  value={novaColunaNome}
                  onChange={(e) => setNovaColunaNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddColumn();
                    if (e.key === "Escape") setAddingColumn(false);
                  }}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddColumn}>
                    Adicionar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingColumn(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-amber-500/40 hover:text-foreground"
              >
                <Plus className="size-4" />
                Nova coluna
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeCard ? <KanbanCardView card={activeCard} onClick={() => {}} overlay /> : null}
        </DragOverlay>
      </DndContext>

      <CardDialog
        open={cardDialog !== null}
        onOpenChange={(open) => !open && setCardDialog(null)}
        colunaId={cardDialog?.colunaId ?? null}
        card={cardDialog?.card ?? null}
        onSaved={handleSaved}
      />
    </>
  );
}
