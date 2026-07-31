"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { atualizarConfiguracoesGerais } from "./actions";

export function PlataformaForm({
  linkRecrutamentoPadrao,
  linkEnergiaPadrao,
}: {
  linkRecrutamentoPadrao: string;
  linkEnergiaPadrao: string;
}) {
  const [linkRecrutamento, setLinkRecrutamento] = useState(linkRecrutamentoPadrao);
  const [linkEnergia, setLinkEnergia] = useState(linkEnergiaPadrao);
  const [isPending, startTransition] = useTransition();

  function handleSalvar() {
    startTransition(async () => {
      try {
        await atualizarConfiguracoesGerais({
          linkRecrutamentoPadrao: linkRecrutamento,
          linkEnergiaPadrao: linkEnergia,
        });
        toast.success("Configurações salvas.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="link_recrutamento_padrao">Link padrão — Recrutamento</Label>
        <Input
          id="link_recrutamento_padrao"
          value={linkRecrutamento}
          onChange={(e) => setLinkRecrutamento(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="link_energia_padrao">Link padrão — Energia</Label>
        <Input
          id="link_energia_padrao"
          value={linkEnergia}
          onChange={(e) => setLinkEnergia(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Esses dados são compartilhados por toda a consultoria — alterações aqui valem para todos.
      </p>
      <Button onClick={handleSalvar} disabled={isPending} className="self-start">
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
}
