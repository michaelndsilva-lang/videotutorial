"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { atualizarModoAgente } from "./actions";
import type { AgenteModo } from "@/lib/types/database.types";

const MODO_LABEL: Record<AgenteModo, string> = {
  recrutamento: "Recrutamento",
  energia: "Energia",
  sunne: "SUNNE",
};

export function ModoForm({
  modoAtivo,
  sunneHabilitado,
}: {
  modoAtivo: AgenteModo;
  sunneHabilitado: boolean;
}) {
  // SUNNE é exclusivo de membros liberados — para os demais a opção nem existe.
  const modos = (Object.keys(MODO_LABEL) as AgenteModo[]).filter(
    (m) => m !== "sunne" || sunneHabilitado
  );
  const [modo, setModo] = useState(modoAtivo);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    const novoModo = value as AgenteModo;
    const anterior = modo;
    setModo(novoModo);
    startTransition(async () => {
      try {
        await atualizarModoAgente(novoModo);
        toast.success(`Modo alterado para ${MODO_LABEL[novoModo]}.`);
      } catch (error) {
        setModo(anterior);
        toast.error(error instanceof Error ? error.message : "Não foi possível alterar o modo.");
      }
    });
  }

  return (
    <Tabs value={modo} onValueChange={handleChange}>
      <TabsList>
        {modos.map((m) => (
          <TabsTrigger key={m} value={m} disabled={isPending}>
            {MODO_LABEL[m]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
