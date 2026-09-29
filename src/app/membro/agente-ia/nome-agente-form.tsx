"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { atualizarNomeAgente } from "./actions";
import type { GeneroAgente } from "@/lib/types/database.types";

const GENERO_LABEL: Record<GeneroAgente, string> = {
  feminino: "Consultora",
  masculino: "Consultor",
};

export function NomeAgenteForm({
  nomeAgenteInicial,
  generoAgenteInicial,
}: {
  nomeAgenteInicial: string;
  generoAgenteInicial: GeneroAgente | null;
}) {
  const [nome, setNome] = useState(nomeAgenteInicial);
  const [genero, setGenero] = useState<GeneroAgente | null>(generoAgenteInicial);
  const [isPending, startTransition] = useTransition();

  function handleSalvar() {
    startTransition(async () => {
      try {
        await atualizarNomeAgente(nome, genero);
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

      <Label className="mt-2">Você é consultor ou consultora?</Label>
      <Tabs value={genero ?? undefined} onValueChange={(v) => setGenero(v as GeneroAgente)}>
        <TabsList>
          {(Object.keys(GENERO_LABEL) as GeneroAgente[]).map((g) => (
            <TabsTrigger key={g} value={g} disabled={isPending}>
              {GENERO_LABEL[g]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <p className="text-xs text-muted-foreground">
        Usado para o agente falar de si mesmo(a) no gênero certo ao responder os leads.
      </p>
    </div>
  );
}
