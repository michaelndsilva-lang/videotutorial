"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { definirPatrocinador } from "../actions";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function PatrocinadorForm({
  usuarioId,
  atual,
  opcoes,
}: {
  usuarioId: string;
  atual: string | null;
  opcoes: { id: string; nome: string }[];
}) {
  const [valor, setValor] = useState(atual ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        className={selectClass}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        aria-label="Patrocinador"
      >
        <option value="">Sem patrocinador</option>
        {opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={isPending || valor === (atual ?? "")}
        onClick={() =>
          startTransition(async () => {
            try {
              await definirPatrocinador(usuarioId, valor || null);
              toast.success("Patrocinador salvo.");
              router.refresh();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
            }
          })
        }
      >
        Salvar
      </Button>
    </div>
  );
}
