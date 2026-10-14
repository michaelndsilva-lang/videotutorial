"use client";

import { CalendarClock, Phone, Sparkles } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ORIGEM_LABEL, formatarData, hojeBrasilia } from "@/lib/kanban/origem";
import type { CardRow } from "./types";

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase();
}

export function KanbanCardView({
  card,
  onClick,
  overlay = false,
}: {
  card: CardRow;
  onClick: () => void;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isAgente = card.origem === "agente_ia";

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "cursor-grab touch-none gap-0 border-l-[3px] py-0 select-none active:cursor-grabbing",
        isAgente ? "border-l-amber-500" : "border-l-sky-500",
        isDragging && "opacity-40",
        overlay && "rotate-2 scale-[1.03] shadow-xl"
      )}
    >
      <CardContent className="flex items-start gap-3 px-3 py-3">
        <Avatar size="sm" className="mt-0.5">
          <AvatarFallback
            className={cn(
              "font-mono text-[0.6rem] font-semibold",
              isAgente
                ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                : "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300"
            )}
          >
            {initialsFrom(card.nome_lead)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-sm font-medium text-foreground">{card.nome_lead}</p>
          {card.telefone && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="size-3" />
              {card.telefone}
            </p>
          )}
          <div className="mt-0.5 flex flex-wrap gap-1">
            {isAgente ? (
              <span className="flex w-fit items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                <Sparkles className="size-2.5" />
                Agente IA
              </span>
            ) : card.origem !== "manual" ? (
              <span className="w-fit rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {ORIGEM_LABEL[card.origem]}
              </span>
            ) : null}
            {card.proximo_followup && <FollowupChip data={card.proximo_followup} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FollowupChip({ data }: { data: string }) {
  const hoje = hojeBrasilia();
  const atrasado = data < hoje;
  const ehHoje = data === hoje;
  return (
    <span
      className={cn(
        "flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        atrasado
          ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
          : ehHoje
            ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
            : "bg-muted text-muted-foreground"
      )}
    >
      <CalendarClock className="size-2.5" />
      {atrasado ? "Atrasado · " : ehHoje ? "Hoje · " : ""}
      {formatarData(data)}
    </span>
  );
}
