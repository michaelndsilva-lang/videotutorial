"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { KanbanCardView } from "./kanban-card";
import type { CardRow, ColumnRow } from "./types";

export function KanbanColumn({
  column,
  cards,
  onAddCard,
  onEditCard,
  onRename,
  onDelete,
}: {
  column: ColumnRow;
  cards: CardRow[];
  onAddCard: () => void;
  onEditCard: (card: CardRow) => void;
  onRename: (nome: string) => void;
  onDelete: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [editingNome, setEditingNome] = useState(false);
  const [nomeDraft, setNomeDraft] = useState(column.nome);

  function saveRename() {
    setEditingNome(false);
    const trimmed = nomeDraft.trim();
    if (trimmed && trimmed !== column.nome) {
      onRename(trimmed);
    } else {
      setNomeDraft(column.nome);
    }
  }

  return (
    <div className="group/column flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card/40">
      <div className="flex items-center justify-between gap-2 border-b border-border/80 px-3 py-2.5">
        {editingNome ? (
          <Input
            autoFocus
            value={nomeDraft}
            onChange={(e) => setNomeDraft(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveRename();
              if (e.key === "Escape") {
                setNomeDraft(column.nome);
                setEditingNome(false);
              }
            }}
            className="h-7 text-sm"
          />
        ) : (
          <button
            className="truncate text-left text-xs font-semibold tracking-wide text-foreground/80 uppercase hover:text-foreground"
            onClick={() => setEditingNome(true)}
          >
            {column.nome}
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 font-mono text-[0.65rem] font-medium text-muted-foreground">
            {cards.length}
          </span>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground opacity-0 transition-opacity group-hover/column:opacity-100 disabled:opacity-0"
                  disabled={cards.length > 0}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir coluna &quot;{column.nome}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 p-2 transition-colors",
          isOver && "bg-muted/60"
        )}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCardView key={card.id} card={card} onClick={() => onEditCard(card)} />
          ))}
        </SortableContext>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start text-muted-foreground"
          onClick={onAddCard}
        >
          <Plus className="size-4" />
          Novo lead
        </Button>
      </div>
    </div>
  );
}
