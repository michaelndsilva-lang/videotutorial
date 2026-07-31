"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { setMembroStatus, removerMembro } from "./actions";
import type { MembroStatus } from "@/lib/types/database.types";

export function MembroActions({
  usuarioId,
  status,
  nome,
}: {
  usuarioId: string;
  status: MembroStatus;
  nome: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function changeStatus(status: MembroStatus) {
    startTransition(async () => {
      try {
        await setMembroStatus(usuarioId, status);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
      }
    });
  }

  function remover() {
    startTransition(async () => {
      try {
        await removerMembro(usuarioId);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível remover.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "pendente" && (
        <>
          <Button size="sm" disabled={isPending} onClick={() => changeStatus("ativo")}>
            Aprovar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => changeStatus("inativo")}
          >
            Recusar
          </Button>
        </>
      )}
      {status === "ativo" && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => changeStatus("inativo")}
        >
          Desativar
        </Button>
      )}
      {status === "inativo" && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => changeStatus("ativo")}
        >
          Reativar
        </Button>
      )}

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button size="sm" variant="destructive" disabled={isPending}>
              Remover
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga a conta e todos os dados do membro (Kanban, conexão de WhatsApp). Não
              pode ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remover}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
