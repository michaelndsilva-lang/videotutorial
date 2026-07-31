"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCard, deleteCard, updateCard } from "./actions";
import type { CardRow } from "./types";

export function CardDialog({
  open,
  onOpenChange,
  colunaId,
  card,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colunaId: string | null;
  card: CardRow | null;
  onSaved: () => void;
}) {
  const [nomeLead, setNomeLead] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [isPending, startTransition] = useTransition();

  // Reseta os campos quando o dialog abre (padrão React: ajustar estado em
  // resposta a uma prop mudando, direto no corpo do render, sem useEffect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setNomeLead(card?.nome_lead ?? "");
      setTelefone(card?.telefone ?? "");
      setObservacoes(card?.observacoes ?? "");
    }
  }

  function handleSave() {
    if (!nomeLead.trim()) {
      toast.error("Informe o nome do lead.");
      return;
    }
    startTransition(async () => {
      try {
        if (card) {
          await updateCard(card.id, { nomeLead, telefone, observacoes });
        } else if (colunaId) {
          await createCard({ colunaId, nomeLead, telefone, observacoes });
        }
        onOpenChange(false);
        onSaved();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  function handleDelete() {
    if (!card) return;
    startTransition(async () => {
      try {
        await deleteCard(card.id);
        onOpenChange(false);
        onSaved();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{card ? "Editar lead" : "Novo lead"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome_lead">Nome</Label>
            <Input id="nome_lead" value={nomeLead} onChange={(e) => setNomeLead(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {card ? (
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
