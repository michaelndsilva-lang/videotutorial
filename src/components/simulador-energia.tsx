"use client";

import { useState } from "react";
import { FileDown, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UFS, brl, lerValor, simular, type ConfigSimulador } from "@/lib/energia/simulador";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export type DadosSimulacao = { valor: number; uf: string; cliente: string };

// Simulador de economia (página pública e área do membro). `propostaUrl` é a
// rota que gera o PDF; `children` recebe os dados para o botão "Quero aderir".
export function SimuladorEnergia({
  config,
  propostaUrl,
  pedirNomeCliente = false,
  children,
}: {
  config: ConfigSimulador;
  propostaUrl: string;
  pedirNomeCliente?: boolean;
  children?: (dados: DadosSimulacao) => React.ReactNode;
}) {
  const [valorTexto, setValorTexto] = useState("");
  const [uf, setUf] = useState("");
  const [cliente, setCliente] = useState("");
  const valor = lerValor(valorTexto);
  const r = simular(valor, uf, config);
  const temResultado = valor > 0;

  const params = new URLSearchParams({ valor: String(valor), uf, cliente });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="valor-conta">Quanto vem sua conta de luz por mês?</Label>
          <Input
            id="valor-conta"
            inputMode="decimal"
            placeholder="R$ 300,00"
            value={valorTexto}
            onChange={(e) => setValorTexto(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="uf">Estado</Label>
          <select id="uf" className={selectClass} value={uf} onChange={(e) => setUf(e.target.value)}>
            <option value="">UF</option>
            {UFS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        {pedirNomeCliente && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="cliente">Nome do cliente (para a proposta)</Label>
            <Input id="cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} maxLength={60} />
          </div>
        )}
      </div>

      {temResultado && (
        <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
            <Zap className="size-4" />
            Sua economia estimada
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">{brl(r.economiaMensal)}</p>
              <p className="text-xs text-muted-foreground">por mês</p>
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">{brl(r.economiaAnual)}</p>
              <p className="text-xs text-muted-foreground">em 12 meses</p>
            </div>
          </div>
          {r.abaixoDoMinimo && (
            <p className="rounded-lg bg-background/60 p-2 text-xs">
              Contas abaixo de {brl(config.contaMinima)} geralmente não atingem o consumo mínimo
              (acima de 180 kWh por mês). Vale enviar a conta para análise mesmo assim.
            </p>
          )}
          {r.ufForaDaLista && (
            <p className="rounded-lg bg-background/60 p-2 text-xs">
              A disponibilidade no seu estado precisa ser confirmada.
            </p>
          )}
          <p className="text-xs text-muted-foreground">{config.aviso}</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`${propostaUrl}?${params.toString()}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <FileDown className="size-4" />
              Baixar proposta (PDF)
            </a>
          </div>
          {children?.({ valor, uf, cliente })}
        </div>
      )}
    </div>
  );
}
