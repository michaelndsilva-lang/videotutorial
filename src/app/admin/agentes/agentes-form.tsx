"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { atualizarPrompt } from "./actions";
import type { AgenteModo } from "@/lib/types/database.types";

type AgenteRow = {
  modo: AgenteModo;
  prompt_sistema: string;
  prompt_followup: string;
  updated_at: string;
};

const MODO_LABEL: Record<AgenteModo, string> = {
  recrutamento: "Recrutamento",
  energia: "Energia",
};

function PromptEditor({ row }: { row: AgenteRow }) {
  const [prompt, setPrompt] = useState(row.prompt_sistema);
  const [promptFollowup, setPromptFollowup] = useState(row.prompt_followup);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await atualizarPrompt(row.modo, prompt, promptFollowup);
        toast.success("Prompt salvo.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={16}
        placeholder={`Escreva aqui o prompt mestre do modo ${MODO_LABEL[row.modo]}...`}
        className="font-mono text-sm"
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`followup-${row.modo}`} className="text-sm font-medium">
          Follow-up
        </label>
        <p className="text-xs text-muted-foreground">
          Mensagem enviada automaticamente ao lead que abandonar a conversa ou não responder em
          um período de 3 horas.
        </p>
        <Textarea
          id={`followup-${row.modo}`}
          value={promptFollowup}
          onChange={(e) => setPromptFollowup(e.target.value)}
          rows={6}
          placeholder="Escreva aqui a mensagem de follow-up para leads inativos..."
          className="font-mono text-sm"
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Última atualização: {new Date(row.updated_at).toLocaleString("pt-BR")}
        </p>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

export function AgentesForm({ rows }: { rows: AgenteRow[] }) {
  return (
    <Tabs defaultValue={rows[0]?.modo}>
      <TabsList>
        {rows.map((row) => (
          <TabsTrigger key={row.modo} value={row.modo}>
            {MODO_LABEL[row.modo]}
          </TabsTrigger>
        ))}
      </TabsList>
      {rows.map((row) => (
        <TabsContent key={row.modo} value={row.modo}>
          <PromptEditor row={row} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
