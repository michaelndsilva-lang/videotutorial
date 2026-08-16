"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ajustarCreditoMembro, ajustarCreditoEmMassa } from "./actions";

export type LinhaCredito = { usuarioId: string; nome: string; saldo: number };

function LinhaMembro({ linha, onSaldoChange }: { linha: LinhaCredito; onSaldoChange: (novoSaldo: number) => void }) {
  const [valor, setValor] = useState(String(linha.saldo));
  const [isPending, startTransition] = useTransition();

  function aplicar(novo: number) {
    startTransition(async () => {
      try {
        const saldoApos = await ajustarCreditoMembro(linha.usuarioId, novo);
        setValor(String(saldoApos));
        onSaldoChange(saldoApos);
        toast.success(`Créditos de ${linha.nome} atualizados.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível ajustar.");
      }
    });
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{linha.nome}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-24"
            disabled={isPending}
          />
          <Button size="sm" variant="outline" onClick={() => aplicar(Number(valor))} disabled={isPending}>
            Aplicar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => aplicar(0)} disabled={isPending}>
            Zerar
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function CreditosTable({ linhas: linhasIniciais }: { linhas: LinhaCredito[] }) {
  const [linhas, setLinhas] = useState(linhasIniciais);
  const [valorEmMassa, setValorEmMassa] = useState("0");
  const [isPendingMassa, startTransitionMassa] = useTransition();

  function atualizarSaldo(usuarioId: string, novoSaldo: number) {
    setLinhas((prev) => prev.map((l) => (l.usuarioId === usuarioId ? { ...l, saldo: novoSaldo } : l)));
  }

  function handleAjusteEmMassa(modo: "definir" | "adicionar") {
    const valor = Number(valorEmMassa);
    startTransitionMassa(async () => {
      try {
        const ajustes = linhas.map((l) => ({
          usuarioId: l.usuarioId,
          novoSaldo: modo === "definir" ? valor : l.saldo + valor,
        }));
        const resultados = await ajustarCreditoEmMassa(ajustes);
        setLinhas((prev) => prev.map((l) => ({ ...l, saldo: resultados[l.usuarioId] ?? l.saldo })));
        toast.success("Créditos ajustados para todos os membros.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível ajustar em massa.");
      }
    });
  }

  if (linhas.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum membro ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">Ajuste em massa (todos os membros):</span>
        <Input
          type="number"
          value={valorEmMassa}
          onChange={(e) => setValorEmMassa(e.target.value)}
          className="w-24"
          disabled={isPendingMassa}
        />
        <Button size="sm" variant="outline" onClick={() => handleAjusteEmMassa("definir")} disabled={isPendingMassa}>
          Definir para todos
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleAjusteEmMassa("adicionar")} disabled={isPendingMassa}>
          Adicionar a todos
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Membro</TableHead>
            <TableHead>Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((linha) => (
            // key inclui o saldo: força remount quando o valor muda por
            // fora (ajuste em massa, ou outra aba) — sem isso o input local
            // (useState) fica preso no valor antigo, mesmo o saldo real já
            // tendo mudado. Mesmo bug confirmado no editor de templates.
            <LinhaMembro
              key={`${linha.usuarioId}:${linha.saldo}`}
              linha={linha}
              onSaldoChange={(novo) => atualizarSaldo(linha.usuarioId, novo)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
