"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { aprovarMembrosEmLote } from "./actions";
import { MembroActions } from "./membro-actions";

export type MembroPendente = {
  usuarioId: string;
  nome: string;
  email: string | null;
  cadastradoEm: string;
};

// Aba Pendentes: lista com seleção para aprovar vários de uma vez.
export function PendentesLista({ membros }: { membros: MembroPendente[] }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const todosMarcados = membros.length > 0 && selecionados.size === membros.length;

  function alternar(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function aprovarSelecionados() {
    const ids = Array.from(selecionados);
    startTransition(async () => {
      try {
        await aprovarMembrosEmLote(ids);
        toast.success(ids.length === 1 ? "1 membro aprovado." : `${ids.length} membros aprovados.`);
        setSelecionados(new Set());
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível aprovar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={todosMarcados}
            onChange={() =>
              setSelecionados(todosMarcados ? new Set() : new Set(membros.map((m) => m.usuarioId)))
            }
          />
          Selecionar todos
        </label>
        <Button
          size="sm"
          disabled={isPending || selecionados.size === 0}
          onClick={aprovarSelecionados}
        >
          Aprovar selecionados{selecionados.size > 0 ? ` (${selecionados.size})` : ""}
        </Button>
      </div>

      <ul className="flex flex-col divide-y rounded-xl border">
        {membros.map((m) => (
          <li key={m.usuarioId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <label className="flex min-w-0 flex-1 items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-primary"
                checked={selecionados.has(m.usuarioId)}
                onChange={() => alternar(m.usuarioId)}
                aria-label={`Selecionar ${m.nome}`}
              />
              <span className="flex min-w-0 flex-col">
                <Link
                  href={`/admin/membros/${m.usuarioId}`}
                  className="truncate font-medium underline-offset-4 hover:underline"
                >
                  {m.nome}
                </Link>
                <span className="truncate text-sm text-muted-foreground">{m.email}</span>
                <span className="text-xs text-muted-foreground">
                  Cadastro em {new Date(m.cadastradoEm).toLocaleDateString("pt-BR")}
                </span>
              </span>
            </label>
            <MembroActions usuarioId={m.usuarioId} status="pendente" nome={m.nome} />
          </li>
        ))}
      </ul>
    </div>
  );
}
