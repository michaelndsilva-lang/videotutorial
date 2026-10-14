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
import { LIMITE_DIARIO_PADRAO } from "@/lib/acesso/labels";
import { MotivoDialog } from "./motivo-dialog";
import { RoboConfigDialog } from "./robo-config-dialog";
import {
  setMembroStatus,
  removerMembro,
  recusarSolicitacaoRobo,
  revogarRobo,
} from "./actions";
import type { AgenteModo, MembroStatus, RoboStatus } from "@/lib/types/database.types";

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

  function aprovarOuReativar() {
    startTransition(async () => {
      try {
        await setMembroStatus(usuarioId, "ativo");
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
          <Button size="sm" disabled={isPending} onClick={aprovarOuReativar}>
            Aprovar
          </Button>
          <MotivoDialog
            triggerLabel="Recusar"
            title={`Recusar ${nome}?`}
            description="O membro verá a tela de acesso negado. Você pode reativar depois."
            confirmLabel="Recusar"
            onConfirm={(motivo) => setMembroStatus(usuarioId, "recusado", motivo)}
          />
        </>
      )}
      {status === "ativo" && (
        <MotivoDialog
          triggerLabel="Suspender"
          title={`Suspender ${nome}?`}
          description="O membro perde o acesso na hora e o robô de WhatsApp é revogado e desconectado. Os dados ficam guardados."
          confirmLabel="Suspender"
          onConfirm={(motivo) => setMembroStatus(usuarioId, "suspenso", motivo)}
        />
      )}
      {(status === "suspenso" || status === "recusado" || status === "inativo") && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={aprovarOuReativar}>
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
              pode ser desfeito. Para só bloquear o acesso, use Suspender.
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

export function RoboActions({
  usuarioId,
  nome,
  membroStatus,
  roboStatus,
  modosPermitidos,
  limite,
}: {
  usuarioId: string;
  nome: string;
  membroStatus: MembroStatus;
  roboStatus: RoboStatus;
  modosPermitidos: AgenteModo[];
  limite: number;
}) {
  // O banco só aceita liberar para membro aprovado.
  if (membroStatus !== "ativo") {
    return <span className="text-xs text-muted-foreground">Aprove o membro primeiro</span>;
  }

  const limiteOuPadrao = limite || LIMITE_DIARIO_PADRAO;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {roboStatus === "solicitado" && (
        <>
          <RoboConfigDialog
            usuarioId={usuarioId}
            nome={nome}
            modo="liberar"
            modosIniciais={modosPermitidos}
            limiteInicial={limiteOuPadrao}
            triggerLabel="Liberar"
          />
          <MotivoDialog
            triggerLabel="Recusar"
            title={`Recusar o pedido de ${nome}?`}
            description="O membro volta para 'sem acesso' e pode pedir de novo depois. O motivo aparece para ele."
            confirmLabel="Recusar pedido"
            onConfirm={(motivo) => recusarSolicitacaoRobo(usuarioId, motivo)}
          />
        </>
      )}
      {(roboStatus === "sem_acesso" || roboStatus === "revogado") && (
        <RoboConfigDialog
          usuarioId={usuarioId}
          nome={nome}
          modo="liberar"
          modosIniciais={modosPermitidos}
          limiteInicial={limiteOuPadrao}
          triggerLabel={roboStatus === "revogado" ? "Reativar robô" : "Liberar robô"}
        />
      )}
      {roboStatus === "liberado" && (
        <>
          <RoboConfigDialog
            usuarioId={usuarioId}
            nome={nome}
            modo="editar"
            modosIniciais={modosPermitidos}
            limiteInicial={limiteOuPadrao}
            triggerLabel="Editar limite"
          />
          <MotivoDialog
            triggerLabel="Revogar"
            triggerVariant="destructive"
            title={`Revogar o robô de ${nome}?`}
            description="O WhatsApp do membro é desconectado do robô na hora. Você pode reativar depois."
            confirmLabel="Revogar"
            onConfirm={(motivo) => revogarRobo(usuarioId, motivo)}
          />
        </>
      )}
    </div>
  );
}
