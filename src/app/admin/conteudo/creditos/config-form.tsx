"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { salvarConfigCreditos } from "./actions";

const MODO_LABEL = {
  plataforma: "Plataforma (créditos mensais)",
  chave_propria: "Chave própria do membro",
  ilimitado: "Ilimitado",
} as const;

type ModoCredito = keyof typeof MODO_LABEL;

export function ConfigCreditosForm({
  modoCredito,
  creditosMensaisPadrao,
  custoPorGeracao,
  modeloIaConteudo,
}: {
  modoCredito: string;
  creditosMensaisPadrao: number;
  custoPorGeracao: number;
  modeloIaConteudo: string;
}) {
  const [modo, setModo] = useState<ModoCredito>((modoCredito as ModoCredito) ?? "plataforma");
  const [creditos, setCreditos] = useState(String(creditosMensaisPadrao));
  const [custo, setCusto] = useState(String(custoPorGeracao));
  const [modelo, setModelo] = useState(modeloIaConteudo);
  const [isPending, startTransition] = useTransition();

  function handleSalvar() {
    startTransition(async () => {
      try {
        await salvarConfigCreditos({
          modoCredito: modo,
          creditosMensaisPadrao: Number(creditos),
          custoPorGeracao: Number(custo),
          modeloIaConteudo: modelo,
        });
        toast.success("Configuração salva.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="modo_credito">Modo de crédito</Label>
        <Select
          value={modo}
          onValueChange={(value) => setModo(value as ModoCredito)}
          items={Object.entries(MODO_LABEL).map(([value, label]) => ({ value, label }))}
        >
          <SelectTrigger id="modo_credito" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(MODO_LABEL) as ModoCredito[]).map((m) => (
              <SelectItem key={m} value={m}>
                {MODO_LABEL[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="creditos_mensais">Créditos mensais padrão</Label>
          <Input id="creditos_mensais" type="number" min={0} value={creditos} onChange={(e) => setCreditos(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="custo_geracao">Custo por geração</Label>
          <Input id="custo_geracao" type="number" min={1} value={custo} onChange={(e) => setCusto(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="modelo_ia">Modelo de IA</Label>
        <Input id="modelo_ia" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="google/gemini-2.5-flash-lite" />
        <p className="text-xs text-muted-foreground">String do Vercel AI Gateway (&quot;provider/model&quot;).</p>
      </div>

      <Button onClick={handleSalvar} disabled={isPending} className="self-start">
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
}
