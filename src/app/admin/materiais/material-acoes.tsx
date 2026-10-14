"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp } from "lucide-react";
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
import { alternarMaterialAtivo, moverMaterial, removerMaterial } from "./actions";

export function MaterialAcoes({
  id,
  titulo,
  ativo,
  primeiro,
  ultimo,
}: {
  id: string;
  titulo: string;
  ativo: boolean;
  primeiro: boolean;
  ultimo: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function executar(acao: () => Promise<void>, sucesso?: string) {
    startTransition(async () => {
      try {
        await acao();
        if (sucesso) toast.success(sucesso);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível concluir.");
      }
    });
  }

  return (
    <>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Mover para cima"
        disabled={isPending || primeiro}
        onClick={() => executar(() => moverMaterial(id, "cima"))}
      >
        <ArrowUp className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Mover para baixo"
        disabled={isPending || ultimo}
        onClick={() => executar(() => moverMaterial(id, "baixo"))}
      >
        <ArrowDown className="size-4" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          executar(
            () => alternarMaterialAtivo(id, !ativo),
            ativo ? "Material desativado: os membros não veem mais." : "Material ativado."
          )
        }
      >
        {ativo ? "Desativar" : "Ativar"}
      </Button>
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
            <AlertDialogTitle>Remover “{titulo}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Apaga o material e o arquivo. Links já compartilhados com leads param de funcionar.
              Para só esconder, use Desativar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executar(() => removerMaterial(id), "Material removido.")}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
