"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UFS, brl, simular } from "@/lib/energia/simulador";
import { cn } from "@/lib/utils";
import { salvarEnergiaConfig } from "./actions";

export function EnergiaConfigForm({
  inicial,
}: {
  inicial: {
    descontoPercentual: number;
    fatiaConsumoPercentual: number;
    contaMinima: number;
    ufsAtendidas: string[];
    aviso: string;
  };
}) {
  const [desconto, setDesconto] = useState(String(inicial.descontoPercentual));
  const [fatia, setFatia] = useState(String(inicial.fatiaConsumoPercentual));
  const [minima, setMinima] = useState(String(inicial.contaMinima));
  const [ufs, setUfs] = useState<string[]>(inicial.ufsAtendidas);
  const [aviso, setAviso] = useState(inicial.aviso);
  const [isPending, startTransition] = useTransition();

  const exemplo = simular(300, "", {
    descontoPercentual: Number(desconto) || 0,
    fatiaConsumoPercentual: Number(fatia) || 0,
    contaMinima: Number(minima) || 0,
    ufsAtendidas: [],
    aviso: "",
  });

  function alternarUf(u: string) {
    setUfs((atual) => (atual.includes(u) ? atual.filter((x) => x !== u) : [...atual, u]));
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          try {
            await salvarEnergiaConfig({
              descontoPercentual: Number(desconto),
              fatiaConsumoPercentual: Number(fatia),
              contaMinima: Number(minima),
              ufsAtendidas: ufs,
              aviso,
            });
            toast.success("Simulador atualizado.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
          }
        });
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="desconto">Desconto sobre o consumo (%)</Label>
          <Input id="desconto" inputMode="decimal" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fatia">Fatia do consumo na conta (%)</Label>
          <Input id="fatia" inputMode="decimal" value={fatia} onChange={(e) => setFatia(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="minima">Conta mínima (R$)</Label>
          <Input id="minima" inputMode="decimal" value={minima} onChange={(e) => setMinima(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Exemplo: conta de R$ 300 → economia estimada de {brl(exemplo.economiaMensal)}/mês (
        {brl(exemplo.economiaAnual)} por ano).
      </p>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">
          Estados atendidos (nenhum marcado = não restringe)
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {UFS.map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={ufs.includes(u)}
              onClick={() => alternarUf(u)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs",
                ufs.includes(u)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {u}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="aviso">Aviso exibido no simulador e na proposta</Label>
        <Textarea id="aviso" value={aviso} onChange={(e) => setAviso(e.target.value)} rows={3} maxLength={1000} />
      </div>
      <Button type="submit" className="w-fit" disabled={isPending}>
        Salvar
      </Button>
    </form>
  );
}
