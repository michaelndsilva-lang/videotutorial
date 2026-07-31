"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { atualizarNomeAgente } from "./actions";

export function NomeAgenteForm({ nomeAgenteInicial }: { nomeAgenteInicial: string }) {
  const [nome, setNome] = useState(nomeAgenteInicial);
  const [isPending, startTransition] = useTransition();

  function handleSalvar() {
    startTransition(async () => {
      try {
        await atualizarNomeAgente(nome);
        toast.success("Nome do consultor salvo.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 pb-4 mb-4 border-b border-border">
      <Label htmlFor="nome_agente">Nome do consultor</Label>
      <div className="flex gap-2">
        <Input
          id="nome_agente"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Carlos"
        />
        <Button onClick={handleSalvar} disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Nome que o agente vai usar para se apresentar na conversa com os leads.
      </p>
    </div>
  );
}
