"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { atualizarLinksPessoais } from "./actions";

export function PlataformaForm({
  linkRecrutamento,
  linkEnergia,
  linkLoja,
}: {
  linkRecrutamento: string;
  linkEnergia: string;
  linkLoja: string;
}) {
  const [linkRecrutamentoValue, setLinkRecrutamentoValue] = useState(linkRecrutamento);
  const [linkEnergiaValue, setLinkEnergiaValue] = useState(linkEnergia);
  const [linkLojaValue, setLinkLojaValue] = useState(linkLoja);
  const [isPending, startTransition] = useTransition();

  function handleSalvar() {
    startTransition(async () => {
      try {
        await atualizarLinksPessoais({
          linkRecrutamento: linkRecrutamentoValue,
          linkEnergia: linkEnergiaValue,
          linkLoja: linkLojaValue,
        });
        toast.success("Links salvos.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="link_recrutamento">Seu link — Recrutamento</Label>
        <Input
          id="link_recrutamento"
          value={linkRecrutamentoValue}
          onChange={(e) => setLinkRecrutamentoValue(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="link_energia">Seu link — Energia</Label>
        <Input
          id="link_energia"
          value={linkEnergiaValue}
          onChange={(e) => setLinkEnergiaValue(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="link_loja">Seu link — Loja (compra de produtos)</Label>
        <Input
          id="link_loja"
          value={linkLojaValue}
          onChange={(e) => setLinkLojaValue(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Seus links pessoais de cadastro — o agente de IA usa exatamente estes ao enviar o link para um lead, pra
        garantir que o cadastro fique atribuído a você.
      </p>
      <Button onClick={handleSalvar} disabled={isPending} className="self-start">
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
}
